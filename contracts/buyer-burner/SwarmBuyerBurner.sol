// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.25;

import { SwarmBuyerBurnerBase } from "./SwarmBuyerBurnerBase.sol";

import { IERC20Burnable } from "./interfaces/IERC20Burnable.sol";
import { TokenInfo } from "./structures/BuyerBurnerStructures.sol";

/// @title SwarmBuyerBurner smart contract (as part of the "SwarmX.eth Protocol")
/// @notice This contract provides functionality to swap and burn ERC20 tokens using Uniswap V3.
/// @dev It leverages Uniswap V3 for token swaps and supports burning a specific token.
contract SwarmBuyerBurner is SwarmBuyerBurnerBase {
    function initialize(
        address dotc,
        DEXType[] calldata dexTypes,
        DexConfig[] calldata dexConfigs,
        TokenInfo[] calldata depositTokens
    ) external initializer {
        _setDotc(dotc);
        _setDexConfigs(dexTypes, dexConfigs);
        _addTokens(depositTokens);

        _setOwner(msg.sender);
    }
    /// @notice Burns a specific amount of SMTs.
    /// @param amount The amount of SMTs to burn.
    function burnSMT(address token, uint256 amount) external onlyOwner {
        IERC20Burnable(token).burn(amount);
    }

    function _finishSwap(address token, uint256 amount) internal override {
        IERC20Burnable(token).burn(amount);
    }
}
