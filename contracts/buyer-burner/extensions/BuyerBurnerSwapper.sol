// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.25;

import { SafeTransferLib } from "solady/src/utils/SafeTransferLib.sol";
import { MetadataReaderLib } from "solady/src/utils/MetadataReaderLib.sol";

import { IV3SwapFactory } from "../interfaces/IV3SwapFactory.sol";
import { IV3SwapRouter } from "../interfaces/IV3SwapRouter.sol";
import { IV3SwapQuoter } from "../interfaces/IV3SwapQuoter.sol";

import { BuyerBurnerWhitelistedTokens } from "./BuyerBurnerWhitelistedTokens.sol";

abstract contract BuyerBurnerSwapper is BuyerBurnerWhitelistedTokens {
    using SafeTransferLib for address;
    using MetadataReaderLib for address;

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
        address finalToken;
        address swapV3Router;
        IV3SwapQuoter swapV3Quoter;
        IV3SwapFactory swapV3Factory;
    }

    mapping(DEXType dexType => DexConfig config) internal _dexConfigs;

    function _setDexConfigs(DEXType[] calldata dexTypes, DexConfig[] calldata dexConfigs) internal {
        require(dexTypes.length == dexConfigs.length, ArraySizesNotEq());

        for (uint256 i; i < dexTypes.length; ++i) {
            _dexConfigs[dexTypes[i]] = dexConfigs[i];

            emit DexConfigSet(dexTypes[i], dexConfigs[i]);
        }
    }

    function _swap(DEXType dexType) internal returns (uint256 fullAmountOut) {
        address[] memory _tokens = tokens;
        DexConfig memory config = _dexConfigs[dexType];

        for (uint256 i = 0; i < _tokens.length; ++i) {
            uint256 amountIn = _tokens[i].balanceOf(address(this));
            if (amountIn == 0) {
                emit ZeroBalance(_tokens[i]);
                continue; // Skip if no tokens are available for swapping
            }

            bool isWrappedNative = _tokens[i] == config.intermediateToken;

            bytes memory path;
            uint256 amountOut;
            if (isWrappedNative) {
                path = abi.encodePacked(config.intermediateToken, config.poolFee, config.finalToken);
            } else {
                if (config.swapV3Factory.getPool(_tokens[i], config.intermediateToken, config.poolFee) == address(0)) {
                    amountOut = 1; //TODO: take this 1 from getPrice() that relies on AggregatorV2V3Interface
                    _ifPoolsNA(_tokens[i], amountIn, config.finalToken, amountOut);

                    continue;
                }
                path = abi.encodePacked(
                    _tokens[i],
                    config.poolFee,
                    config.intermediateToken,
                    config.poolFee,
                    config.finalToken
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

            _tokens[i].safeApproveWithRetry(config.swapV3Router, amountIn);

            amountOut = IV3SwapRouter(config.swapV3Router).exactInput(params);
            fullAmountOut += amountOut;

            _tokens[i].safeApprove(config.swapV3Router, amountIn);

            emit Swapped(tokens[i], amountOut);
        }

        _finishSwap(config.finalToken, fullAmountOut);
    }

    function _ifPoolsNA(address tokenIn, uint256 amountIn, address tokenOut, uint256 amountOut) internal virtual;
    function _finishSwap(address token, uint256 amount) internal virtual;
}
