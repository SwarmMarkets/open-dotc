// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.25;

import { SwarmBuyerBurnerBase, DotcV2 } from "./SwarmBuyerBurnerBase.sol";
import { BuyerBurnerCCIPCaller } from "./extensions/BuyerBurnerCCIPCaller.sol";

/// @title SwarmBuyerBurner smart contract (as part of the "SwarmX.eth Protocol")
/// @notice This contract provides functionality to swap and burn ERC20 tokens using Uniswap V3.
/// @dev It leverages Uniswap V3 for token swaps and supports burning a specific token.
contract ChildSwarmBuyerBurner is SwarmBuyerBurnerBase, BuyerBurnerCCIPCaller {
    function initialize(
        DotcV2 dotc,
        CCIPConfig calldata ccipConfig,
        DEXType[] calldata dexTypes,
        DexConfig[] calldata dexConfigs,
        address[] calldata depositTokens
    ) external initializer {
        _setDotc(dotc);
        _setCCIPConfig(ccipConfig);
        _setDexConfigs(dexTypes, dexConfigs);
        _addTokens(depositTokens);

        _setOwner(msg.sender);
    }

    function _finishSwap(address token, uint256 amount) internal override {
        _ccipTransfer(token, amount);
    }
}
