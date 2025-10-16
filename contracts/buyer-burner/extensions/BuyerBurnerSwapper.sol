// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.25;

import { SafeTransferLib } from "solady/src/utils/SafeTransferLib.sol";

import { IV3SwapFactory } from "../interfaces/IV3SwapFactory.sol";
import { IV3SwapRouter } from "../interfaces/IV3SwapRouter.sol";
import { IV3SwapQuoterV2 } from "../interfaces/IV3SwapQuoterV2.sol";
import { IV3SwapPool } from "../interfaces/IV3SwapPool.sol";

import { BuyerBurnerWhitelistedTokens } from "./BuyerBurnerWhitelistedTokens.sol";
import { BuyerBurnerOfferMaker } from "./BuyerBurnerOfferMaker.sol";
import { TokenInfo } from "../structures/BuyerBurnerStructures.sol";
import { PathSanity } from "./PathSanity.sol";

abstract contract BuyerBurnerSwapper is BuyerBurnerWhitelistedTokens, BuyerBurnerOfferMaker {
    using SafeTransferLib for address;

    error SwapFailed(address tokenIn, address tokenOut, uint256 amountIn);
    event DexConfigSet(DEXType dexType, DexConfig config);
    event DexConfigRemoved(DEXType dexType);
    /// @notice Emitted when a `token` is swapped to SMT using WETH9 as an intermediary.
    /// @param amountOut The amount of SMT received.
    event Swapped(address tokenFrom, address tokenTo, uint256 amountOut);
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

    function _swap(DEXType dexType) internal virtual returns (uint256 fullAmountOut) {
        TokenInfo[] memory tokens = _tokens;
        DexConfig memory config = _dexConfigs[dexType];

        for (uint256 i = 0; i < tokens.length; ) {
            uint256 amountIn = tokens[i].token.balanceOf(address(this));
            if (amountIn == 0) {
                emit ZeroBalance(tokens[i].token);
                unchecked {
                    ++i;
                }
                continue;
            }
            if (tokens[i].token == config.finalToken.token) {
                unchecked {
                    ++i;
                }
                continue;
            }

            bytes memory path;
            if (tokens[i].token == config.intermediateToken) {
                (bool ok, uint24 fee) = _firstLivePool(
                    config.swapV3Factory,
                    config.intermediateToken,
                    config.finalToken.token,
                    config.poolFees
                );
                if (!ok) {
                    _makeOffer(tokens[i], amountIn, config.finalToken);
                    unchecked {
                        ++i;
                    }
                    continue;
                }
                path = abi.encodePacked(config.intermediateToken, fee, config.finalToken.token);
            } else {
                (bool ok1, uint24 fee1) = _firstLivePool(
                    config.swapV3Factory,
                    tokens[i].token,
                    config.intermediateToken,
                    config.poolFees
                );
                (bool ok2, uint24 fee2) = _firstLivePool(
                    config.swapV3Factory,
                    config.intermediateToken,
                    config.finalToken.token,
                    config.poolFees
                );
                if (!ok1 || !ok2) {
                    _makeOffer(tokens[i], amountIn, config.finalToken);
                    unchecked {
                        ++i;
                    }
                    continue;
                }
                path = abi.encodePacked(tokens[i].token, fee1, config.intermediateToken, fee2, config.finalToken.token);
            }

            PathSanity.validateNoAdjacentEqualTokens(path);

            uint256 amountOutMinimum;
            try IV3SwapQuoterV2(config.swapV3Quoter).quoteExactInput(path, amountIn) returns (
                uint256 out,
                uint160[] memory,
                uint32[] memory,
                uint256
            ) {
                if (out == 0) {
                    _makeOffer(tokens[i], amountIn, config.finalToken);
                    unchecked {
                        ++i;
                    }
                    continue;
                }
                amountOutMinimum = out;
            } catch {
                _makeOffer(tokens[i], amountIn, config.finalToken);
                unchecked {
                    ++i;
                }
                continue;
            }

            IV3SwapRouter.ExactInputParamsV1 memory swapParamsV1 = IV3SwapRouter.ExactInputParamsV1({
                path: path,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum
            });

            tokens[i].token.safeApproveWithRetry(config.swapV3Router, amountIn);
            uint256 amountOut;

            try IV3SwapRouter(config.swapV3Router).exactInput(swapParamsV1) returns (uint256 swapped) {
                amountOut = swapped;
            } catch {
                IV3SwapRouter.ExactInputParamsV2 memory swapParamsV2 = IV3SwapRouter.ExactInputParamsV2({
                    path: path,
                    recipient: address(this),
                    amountIn: amountIn,
                    amountOutMinimum: amountOutMinimum
                });
                try IV3SwapRouter(config.swapV3Router).exactInput(swapParamsV2) returns (uint256 swapped) {
                    amountOut = swapped;
                } catch {
                    revert SwapFailed(tokens[i].token, config.finalToken.token, amountIn);
                }
            }
            fullAmountOut += amountOut;

            // reset approval to zero (safer pattern)
            tokens[i].token.safeApprove(config.swapV3Router, 0);

            emit Swapped(tokens[i].token, config.finalToken.token, amountOut);

            unchecked {
                ++i;
            }
        }

        _finishSwap(config.finalToken.token, fullAmountOut);
    }

    function _firstLivePool(
        IV3SwapFactory factory,
        address tokenA,
        address tokenB,
        PoolFees memory fees
    ) internal view virtual returns (bool ok, uint24 feeChosen) {
        (ok, feeChosen) = _checkFee(factory, tokenA, tokenB, fees.tier3);
        if (ok) return (true, feeChosen);

        (ok, feeChosen) = _checkFee(factory, tokenA, tokenB, fees.tier2);
        if (ok) return (true, feeChosen);

        (ok, feeChosen) = _checkFee(factory, tokenA, tokenB, fees.tier4);
        if (ok) return (true, feeChosen);

        (ok, feeChosen) = _checkFee(factory, tokenA, tokenB, fees.tier1);
        if (ok) return (true, feeChosen);

        return (false, 0);
    }

    function _checkFee(
        IV3SwapFactory factory,
        address tokenA,
        address tokenB,
        uint24 fee
    ) internal view virtual returns (bool, uint24) {
        address pool;
        try factory.getPool(tokenA, tokenB, fee) returns (address poolReturned) {
            pool = poolReturned;
        } catch {
            return (false, 0);
        }
        if (pool == address(0)) return (false, 0);
        if (IV3SwapPool(pool).liquidity() == 0) return (false, 0);
        return (true, fee);
    }

    function _finishSwap(address token, uint256 amount) internal virtual;
}
