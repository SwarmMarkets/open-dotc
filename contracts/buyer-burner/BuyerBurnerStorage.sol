// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.19;

contract BuyerBurnerStorage {
    error ArraySizesNotEq();

    event DexConfigSet(DEXType dexType, DexConfig config);

    struct DexConfig {
        uint24 poolFee;
        address smt;
        address wNative;
        address swapV3Factory;
        address swapV3Router;
        address swapV3Quoter;
    }

    enum DEXType {
        NoType,
        UniswapV3,
        PancakeswapV3
    }

    mapping(DEXType dexType => DexConfig config) public dexConfigs;

    function __initialize_BuyerBurnerStorage(DEXType[] calldata dexTypes, DexConfig[] calldata configs) internal {
        _setDexConfigs(dexTypes, configs);
    }

    function _setDexConfigs(DEXType[] calldata dexTypes, DexConfig[] calldata configs) internal {
        require(dexTypes.length == configs.length, ArraySizesNotEq());

        for (uint256 i; i < dexTypes.length; ++i) {
            dexConfigs[dexTypes[i]] = configs[i];

            emit DexConfigSet(dexTypes[i], configs[i]);
        }
    }
}
