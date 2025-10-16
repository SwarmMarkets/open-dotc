// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.25;

import { SafeTransferLib } from "solady/src/utils/SafeTransferLib.sol";

import { IV3SwapFactory } from "../interfaces/IV3SwapFactory.sol";
import { IV3SwapRouter } from "../interfaces/IV3SwapRouter.sol";
import { IV3SwapQuoter, IV3SwapQuoterV2 } from "../interfaces/IV3SwapQuoter.sol";
import { IV3SwapPool } from "../interfaces/IV3SwapPool.sol";

import { BuyerBurnerWhitelistedTokens } from "./BuyerBurnerWhitelistedTokens.sol";
import { BuyerBurnerOfferMaker } from "./BuyerBurnerOfferMaker.sol";
import { TokenInfo } from "../structures/BuyerBurnerStructures.sol";
import { PathSanity } from "./PathSanity.sol";

abstract contract BuyerBurnerSwapper is BuyerBurnerWhitelistedTokens, BuyerBurnerOfferMaker {
    using SafeTransferLib for address;

    event DexConfigSet(DEXType dexType, DexConfig config);
    event DexConfigRemoved(DEXType dexType);
    /// @notice Emitted when a `token` is swapped to SMT using WETH9 as an intermediary.
    /// @param amountOut The amount of SMT received.
    event Swapped(address token, uint256 amountOut);
    event ZeroBalance(address token);

    enum DEXType {
        NoType,
        UniswapV3,
        PancakeswapV3
    }

    struct PoolFees {
        uint24 tier1; // e.g. Uni: 100 (0.01%) | PCS: 100 (optional/not always)
        uint24 tier2; // 500  (0.05%)
        uint24 tier3; // Uni: 3000 (0.30%) | PCS: 2500 (0.25%)
        uint24 tier4; // 10000 (1.00%)
    }

    struct DexConfig {
        DEXType dexType;
        PoolFees poolFees;
        address intermediateToken;
        TokenInfo finalToken;
        address swapV3Router;
        address swapV3Quoter;
        IV3SwapFactory swapV3Factory;
    }

    mapping(DEXType dexType => DexConfig config) internal _dexConfigs;

    function _setDexConfigs(DexConfig[] calldata dexConfigs) internal {
        for (uint256 i; i < dexConfigs.length; ++i) {
            _dexConfigs[dexConfigs[i].dexType] = dexConfigs[i];

            emit DexConfigSet(dexConfigs[i].dexType, dexConfigs[i]);
        }
    }

    function _removeDexConfigs(DEXType dexType) internal {
        delete _dexConfigs[dexType];
        emit DexConfigRemoved(dexType);
    }

    function _swap(DEXType dexType) internal returns (uint256 fullAmountOut) {
        TokenInfo[] memory tokens = _tokens;
        DexConfig memory config = _dexConfigs[dexType];

        for (uint256 i = 0; i < tokens.length; ++i) {
            uint256 amountIn = tokens[i].token.balanceOf(address(this));
            if (amountIn == 0) {
                emit ZeroBalance(tokens[i].token);
                continue; // Skip if no tokens are available for swapping
            }

            bytes memory path;
            if (tokens[i].token == config.intermediateToken) {
                path = abi.encodePacked(config.intermediateToken, config.poolFee, config.finalToken.token);
            } else {
                if (
                    config.swapV3Factory.getPool(tokens[i].token, config.intermediateToken, config.poolFee) !=
                    address(0)
                ) {
                    path = abi.encodePacked(
                        tokens[i].token,
                        config.poolFee,
                        config.intermediateToken,
                        config.poolFee,
                        config.finalToken.token
                    );
                } else {
                    _makeOffer(tokens[i], amountIn, config.finalToken);
                    continue;
                }
            }

            uint256 amountOutMinimum = config.swapV3Quoter.quoteExactInput(path, amountIn);

            // Multiple pool swaps are encoded through bytes called a `path`.
            // A path is a sequence of token addresses and POOL_FEEs that define the pools used in the swaps.
            //
            // The format for pool encoding is (tokenIn, fee, tokenOut/tokenIn, fee, tokenOut)
            // where tokenIn/tokenOut parameter is the shared token across the pools.
            //
            // Since we are swapping `tokens[i]` to WETH9 and then WETH9 to SMT the path encoding
            // is (`tokens[i]`, 0.3%, WETH9, 0.3%, SMT).
            IV3SwapRouter.ExactInputParams memory params = IV3SwapRouter.ExactInputParams({
                path: path,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum
            });

            tokens[i].token.safeApproveWithRetry(config.swapV3Router, amountIn);

            uint256 amountOut = IV3SwapRouter(config.swapV3Router).exactInput(params);
            fullAmountOut += amountOut;

            tokens[i].token.safeApprove(config.swapV3Router, amountIn);

            emit Swapped(tokens[i].token, amountOut);
        }

        _finishSwap(config.finalToken.token, fullAmountOut);
    }

    function _finishSwap(address token, uint256 amount) internal virtual;
}
