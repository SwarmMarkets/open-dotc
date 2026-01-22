// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.25;

import { SwarmBuyerBurnerBase, SafeTransferLib } from "./SwarmBuyerBurnerBase.sol";
import { BuyerBurnerCCIPCaller } from "./extensions/BuyerBurnerCCIPCaller.sol";
import { TokenInfo } from "./structures/BuyerBurnerStructures.sol";

/// @title SwarmBuyerBurner smart contract (as part of the "SwarmX.eth Protocol")
/// @notice This contract provides functionality to swap and burn ERC20 tokens using Uniswap V3.
/// @dev It leverages Uniswap V3 for token swaps and supports burning a specific token.
contract ChildSwarmBuyerBurner is SwarmBuyerBurnerBase, BuyerBurnerCCIPCaller {
    function initialize(
        address dotc,
        CCIPConfig calldata ccipConfig,
        DexConfig[] calldata dexConfigs,
        TokenInfo[] calldata depositTokens
    ) external initializer {
        _setDotc(dotc);
        _setCCIPConfig(ccipConfig);
        _setDexConfigs(dexConfigs);
        _addTokens(depositTokens);

        _setOwner(msg.sender);
    }

    function _finishSwap(address token, uint256) internal override {
        uint256 amount = SafeTransferLib.balanceOf(token, address(this));

        if (amount == 0) {
            if (msg.value != 0) {
                SafeTransferLib.safeTransferETH(msg.sender, msg.value);
            }
            return;
        }

        _ccipTransfer(token, amount);
    }
}
