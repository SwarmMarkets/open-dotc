// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.25;

import { SafeTransferLib } from "solady/src/utils/SafeTransferLib.sol";
import { FixedPointMathLib } from "solady/src/utils/FixedPointMathLib.sol";

import { IV3SwapFactory } from "../interfaces/IV3SwapFactory.sol";
import { IV3SwapRouter } from "../interfaces/IV3SwapRouter.sol";
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

    uint256 internal constant _Q96 = 2 ** 96;
    uint256 internal constant _Q192 = _Q96 * _Q96;
    uint256 internal constant _FEE_DENOMINATOR = 1_000_000; // Uniswap V3 fees are in hundredths of a bip
    uint16 internal constant _BPS_DENOMINATOR = 10_000;
    uint16 internal constant _MAX_SLIPPAGE_BPS = 9_000; // cap tolerance
    uint16 internal constant _MIN_SLIPPAGE_BPS = 500; // 5.00% baseline buffer
    uint16 internal constant _HOP_SLIPPAGE_BPS = 1_500; // add per hop (15.00%)
    uint8 internal constant _FEE_SLIPPAGE_MULTIPLIER = 5; // weight swap fee into slippage

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

    function _swap(DEXType dexType, uint16 slippageBps) internal virtual returns (uint256 fullAmountOut) {
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
            if (dexType == DEXType.PancakeswapV3) {
                // For Pancakeswap on some chains (e.g. BSC forked), pool introspection can fail; use a tiny min-out > 0.
                amountOutMinimum = amountIn / _BPS_DENOMINATOR; // ~0.01% of input
                if (amountOutMinimum == 0 && amountIn != 0) {
                    amountOutMinimum = 1;
                }
            } else {
                (bool minOutOk, uint256 minOut) = _calculateAmountOutMinimum(
                    path,
                    amountIn,
                    config.swapV3Factory,
                    slippageBps
                );
                if (!minOutOk) {
                    _makeOffer(tokens[i], amountIn, config.finalToken);
                    unchecked {
                        ++i;
                    }
                    continue;
                }
                amountOutMinimum = minOut;
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

    function _calculateAmountOutMinimum(
        bytes memory path,
        uint256 amountIn,
        IV3SwapFactory factory,
        uint16 slippageBps
    ) internal view returns (bool ok, uint256 amountOutMinimum) {
        if (path.length < 43) {
            return (false, 0); // at least token-fee-token
        }
        if (slippageBps > _MAX_SLIPPAGE_BPS) {
            return (false, 0);
        }

        address tokenIn = _readAddress(path, 0);
        uint256 offset = 20;
        uint256 amountOut = amountIn;
        uint256 hops;
        uint256 totalFeeBps;

        while (offset < path.length) {
            uint24 fee = _readUint24(path, offset);
            offset += 3;
            if (offset + 20 > path.length) {
                return (false, 0);
            }
            address tokenOut = _readAddress(path, offset);
            offset += 20;
            unchecked {
                ++hops;
            }
            totalFeeBps += fee / 100; // convert Uniswap fee (1e6) to BPS (1e4)

            address pool = _getPool(factory, tokenIn, tokenOut, fee);
            if (pool == address(0)) {
                return (false, 0);
            }

            uint256 quotedAmountOut = _quoteAtCurrentPrice(pool, tokenIn, tokenOut, amountOut, fee);
            if (quotedAmountOut == 0) {
                return (true, 0);
            }
            amountOut = quotedAmountOut;

            tokenIn = tokenOut;
        }

        uint256 bufferBps = _MIN_SLIPPAGE_BPS + (hops * _HOP_SLIPPAGE_BPS) + (totalFeeBps * _FEE_SLIPPAGE_MULTIPLIER);
        if (slippageBps > bufferBps) {
            bufferBps = slippageBps;
        }
        if (bufferBps > _MAX_SLIPPAGE_BPS) {
            bufferBps = _MAX_SLIPPAGE_BPS;
        }

        amountOutMinimum = FixedPointMathLib.mulDiv(amountOut, _BPS_DENOMINATOR - bufferBps, _BPS_DENOMINATOR);
        if (amountOutMinimum > amountIn) {
            amountOutMinimum = amountIn; // clamp to avoid overestimating on mispriced quotes
        }

        return (amountOutMinimum != 0, amountOutMinimum);
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

    function _getPool(
        IV3SwapFactory factory,
        address tokenA,
        address tokenB,
        uint24 fee
    ) internal view returns (address pool) {
        try factory.getPool(tokenA, tokenB, fee) returns (address poolReturned) {
            pool = poolReturned;
        } catch {
            return address(0);
        }
        if (pool == address(0)) {
            return address(0);
        }
        if (IV3SwapPool(pool).liquidity() == 0) {
            return address(0);
        }
    }

    function _quoteAtCurrentPrice(
        address pool,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 fee
    ) internal view returns (uint256) {
        uint256 amountAfterFee = FixedPointMathLib.mulDiv(amountIn, _FEE_DENOMINATOR - fee, _FEE_DENOMINATOR);

        (bool success, bytes memory data) = pool.staticcall(abi.encodeWithSelector(IV3SwapPool.slot0.selector));
        if (!success || data.length < 32) {
            return 0;
        }
        (uint160 sqrtPriceX96, , , , , , ) = abi.decode(data, (uint160, int24, uint16, uint16, uint16, uint8, bool));
        uint256 sqrtPrice = uint256(sqrtPriceX96);

        if (tokenIn < tokenOut) {
            if (sqrtPrice == 0 || amountAfterFee > type(uint256).max / sqrtPrice) return 0;
            uint256 first = (amountAfterFee * sqrtPrice) / _Q96;
            if (first > type(uint256).max / sqrtPrice) return 0;
            return (first * sqrtPrice) / _Q96;
        }
        if (sqrtPrice == 0 || amountAfterFee > type(uint256).max / _Q96) return 0;
        uint256 nextAmount = (amountAfterFee * _Q96) / sqrtPrice;
        return (nextAmount * _Q96) / sqrtPrice;
    }

    function _readAddress(bytes memory data, uint256 start) internal pure returns (address addr) {
        assembly {
            addr := shr(96, mload(add(data, add(start, 32))))
        }
    }

    function _readUint24(bytes memory data, uint256 start) internal pure returns (uint24 value) {
        assembly {
            value := shr(232, mload(add(data, add(start, 32))))
        }
    }

    function _finishSwap(address token, uint256 amount) internal virtual;
}
