// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.25;

interface IV3SwapPool {
    function liquidity() external view returns (uint128);

    function slot0()
        external
        view
        returns (
            uint160 sqrtPriceX96,
            int24 tick,
            uint16 observationIndex,
            uint16 observationCardinality,
            uint16 observationCardinalityNext,
            uint8 feeProtocol,
            bool unlocked
        );
}
