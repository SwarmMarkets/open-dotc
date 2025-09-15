// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.25;

import { SwarmBuyerBurnerBase, DotcV2 } from "./SwarmBuyerBurnerBase.sol";

import { IERC20Burnable } from "./interfaces/IERC20Burnable.sol";

/// @title SwarmBuyerBurner smart contract (as part of the "SwarmX.eth Protocol")
/// @notice This contract provides functionality to swap and burn ERC20 tokens using Uniswap V3.
/// @dev It leverages Uniswap V3 for token swaps and supports burning a specific token.
contract SwarmBuyerBurner is SwarmBuyerBurnerBase {
    function initialize(
        DotcV2 dotc,
        DEXType[] calldata dexTypes,
        DexConfig[] calldata dexConfigs,
        address[] calldata depositTokens
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

    function _ifPoolsNA(address tokenIn, uint256 amountIn, address tokenOut, uint256 amountOut) internal override {
        _makeOffer(tokenIn, amountIn, tokenOut, amountOut);
    }

    function _finishSwap(address token, uint256 amount) internal override {
        IERC20Burnable(token).burn(amount);
    }
}
