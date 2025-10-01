// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.25;

import { SafeTransferLib } from "solady/src/utils/SafeTransferLib.sol";

import { IV3SwapFactory } from "../interfaces/IV3SwapFactory.sol";
import { IV3SwapRouter } from "../interfaces/IV3SwapRouter.sol";
import { IV3SwapQuoter } from "../interfaces/IV3SwapQuoter.sol";

import { BuyerBurnerWhitelistedTokens } from "./BuyerBurnerWhitelistedTokens.sol";
import { BuyerBurnerOfferMaker } from "./BuyerBurnerOfferMaker.sol";
import { TokenInfo } from "../structures/BuyerBurnerStructures.sol";

abstract contract BuyerBurnerSwapper is BuyerBurnerWhitelistedTokens, BuyerBurnerOfferMaker {
    using SafeTransferLib for address;

    error ArraySizesNotEq();

    event DexConfigSet(DEXType dexType, DexConfig config);
    /// @notice Emitted when a `token` is swapped to SMT using WETH9 as an intermediary.
    /// @param amountOut The amount of SMT received.
    event Swapped(address token, uint256 amountOut);
    event ZeroBalance(address token);

    enum DEXType {
        NoType,
        UniswapV3,
        PancakeswapV3
    }

    struct DexConfig {
        uint24 poolFee;
        address intermediateToken;
        TokenInfo finalToken;
        address swapV3Router;
        IV3SwapQuoter swapV3Quoter;
        IV3SwapFactory swapV3Factory;
    }

    mapping(DEXType dexType => DexConfig config) internal _dexConfigs;

    function _setDexConfigs(DEXType[] calldata dexTypes, DexConfig[] calldata dexConfigs) internal {
        if (dexTypes.length != dexConfigs.length) {
            revert ArraySizesNotEq();
        }

        for (uint256 i; i < dexTypes.length; ++i) {
            _dexConfigs[dexTypes[i]] = dexConfigs[i];

            emit DexConfigSet(dexTypes[i], dexConfigs[i]);
        }
    }

    function _swap(DEXType dexType) internal returns (uint256 fullAmountOut) {
        TokenInfo[] memory _tokens = tokens;
        DexConfig memory config = _dexConfigs[dexType];

        for (uint256 i = 0; i < _tokens.length; ++i) {
            uint256 amountIn = _tokens[i].token.balanceOf(address(this));
            if (amountIn == 0) {
                emit ZeroBalance(_tokens[i].token);
                continue; // Skip if no tokens are available for swapping
            }

            bool isWrappedNative = _tokens[i].token == config.intermediateToken;

            bytes memory path;

            if (isWrappedNative) {
                path = abi.encodePacked(config.intermediateToken, config.poolFee, config.finalToken.token);
            } else {
                if (
                    config.swapV3Factory.getPool(_tokens[i].token, config.intermediateToken, config.poolFee) ==
                    address(0)
                ) {
                    _makeOffer(_tokens[i], amountIn, config.finalToken);
                    continue;
                }
                path = abi.encodePacked(
                    _tokens[i].token,
                    config.poolFee,
                    config.intermediateToken,
                    config.poolFee,
                    config.finalToken.token
                );
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

            _tokens[i].token.safeApproveWithRetry(config.swapV3Router, amountIn);

            uint256 amountOut = IV3SwapRouter(config.swapV3Router).exactInput(params);
            fullAmountOut += amountOut;

            _tokens[i].token.safeApprove(config.swapV3Router, amountIn);

            emit Swapped(_tokens[i].token, amountOut);
        }

        _finishSwap(config.finalToken.token, fullAmountOut);
    }

    function _finishSwap(address token, uint256 amount) internal virtual;
}
