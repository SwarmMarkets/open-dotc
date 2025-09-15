// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.25;

import { Initializable } from "solady/src/utils/Initializable.sol";
import { Ownable } from "solady/src/auth/Ownable.sol";
import { SafeTransferLib } from "solady/src/utils/SafeTransferLib.sol";

import { BuyerBurnerSwapper } from "./extensions/BuyerBurnerSwapper.sol";
import { BuyerBurnerOfferMaker, DotcV2 } from "./extensions/BuyerBurnerOfferMaker.sol";

/// @title SwarmBuyerBurner smart contract (as part of the "SwarmX.eth Protocol")
/// @notice This contract provides functionality to swap and burn ERC20 tokens using Uniswap V3.
/// @dev It leverages Uniswap V3 for token swaps and supports burning a specific token.
abstract contract SwarmBuyerBurnerBase is Initializable, Ownable, BuyerBurnerSwapper, BuyerBurnerOfferMaker {
    /// @notice Swaps `token` for SMT through WETH9, with the exact input amount.
    /// @dev Requires approval for spending `token`.
    /// @return fullAmountOut The amount of SMT burned.
    function swap(DEXType dexType) external returns (uint256 fullAmountOut) {
        fullAmountOut = _swap(dexType);
    }

    /// @notice Adds a list of tokens to the whitelist.
    /// @dev Only the owner can call this function.
    /// @dev The function will revert if any of the tokens are already whitelisted.
    /// @dev The function will emit a `Whitelisted` event for each token added.
    /// @dev The function will revert if any of the tokens are already whitelisted.
    /// @param tokensToAdd The list of token addresses to add to the whitelist.
    function addTokens(address[] calldata tokensToAdd) external onlyOwner {
        _addTokens(tokensToAdd);
    }

    /// @notice Removes a list of tokens from the whitelist.
    /// @dev Only the owner can call this function.
    /// @dev The function will revert if any of the tokens are not whitelisted.
    /// @dev The function will emit a `Unwhitelisted` event for each token removed.
    /// @param tokensToRemove The list of token addresses to remove from the whitelist.
    function removeTokens(address[] calldata tokensToRemove) external onlyOwner {
        _removeTokens(tokensToRemove);
    }

    /// @notice Allows the owner to withdraw a specified amount of `token`'s.
    /// @param token The token address to withdraw.
    /// @param amount The amount of the `token`s to withdraw.
    function withdrawTokens(address token, uint256 amount) external onlyOwner {
        SafeTransferLib.safeTransfer(token, msg.sender, amount);
    }
}
