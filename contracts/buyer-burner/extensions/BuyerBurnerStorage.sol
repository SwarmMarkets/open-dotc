// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.28;

import { WhitelistedTokens } from "./WhitelistedTokens.sol";

abstract contract BuyerBurnerStorage is WhitelistedTokens {
    error ArraySizesNotEq();

    event DotcSet(address dotc);
    event DexConfigSet(DEXType dexType, DexConfig config);
    event DexConfigChanged(DEXType dexType, DexConfig config);

    struct DexConfig {
        uint24 poolFee;
        address intermediateToken;
        address finalToken;
        address swapV3Factory;
        address swapV3Router;
        address swapV3Quoter;
    }

    enum DEXType {
        NoType,
        UniswapV3,
        PancakeswapV3
    }

    mapping(DEXType dexType => DexConfig config) internal _dexConfigs;

    function _setDexConfigs(DEXType[] calldata dexTypes, DexConfig[] calldata dexConfigs) internal {
        require(dexTypes.length == dexConfigs.length, ArraySizesNotEq());

        for (uint256 i; i < dexTypes.length; ++i) {
            _dexConfigs[dexTypes[i]] = dexConfigs[i];

            emit DexConfigSet(dexTypes[i], dexConfigs[i]);
        }
    }
}
