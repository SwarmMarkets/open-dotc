// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.28;

abstract contract BuyerBurnerStorage {
    error ArraySizesNotEq();
    error DexConfigured(DEXType dexType);

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

    string private constant TERMS = "https://docs.swarmx.net/";
    string private constant COMMS = "help@swarm.com";

    mapping(DEXType dexType => DexConfig config) public dexConfigs;

    function __initialize_BuyerBurnerStorage_(DEXType[] calldata dexTypes, DexConfig[] calldata configs) internal {
        _setDexConfigs(dexTypes, configs);
    }

    function _setDexConfigs(DEXType[] calldata dexTypes, DexConfig[] calldata configs) internal {
        require(dexTypes.length == configs.length, ArraySizesNotEq());

        for (uint256 i; i < dexTypes.length; ++i) {
            require(dexConfigs[dexTypes[i]].poolFee == 0, DexConfigured(dexTypes[i]));
            dexConfigs[dexTypes[i]] = configs[i];

            emit DexConfigSet(dexTypes[i], configs[i]);
        }
    }

    function _changeDexConfigs(DEXType[] calldata dexTypes, DexConfig[] calldata configs) internal {
        require(dexTypes.length == configs.length, ArraySizesNotEq());

        for (uint256 i; i < dexTypes.length; ++i) {
            dexConfigs[dexTypes[i]] = configs[i];

            emit DexConfigChanged(dexTypes[i], configs[i]);
        }
    }
}
