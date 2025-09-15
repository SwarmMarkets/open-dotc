// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.28;

import { Initializable } from "solady/src/utils/Initializable.sol";
import { Ownable } from "solady/src/auth/Ownable.sol";
import { SafeTransferLib } from "solady/src/utils/SafeTransferLib.sol";
import { MetadataReaderLib } from "solady/src/utils/MetadataReaderLib.sol";

import { AggregatorV2V3Interface } from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV2V3Interface.sol";

import { IV3SwapFactory } from "./interfaces/IV3SwapFactory.sol";
import { IV3SwapRouter } from "./interfaces/IV3SwapRouter.sol";
import { IV3SwapQuoter } from "./interfaces/IV3SwapQuoter.sol";
import { ITokenTransferor } from "./interfaces/ITokenTransferor.sol";
// TODO: unify uniswap and pancakeswap, check pools first in uniswap then pancake

import { BuyerBurnerStorage } from "./extensions/BuyerBurnerStorage.sol";
import { BuyerBurnerDotcOfferMaker } from "./extensions/BuyerBurnerOfferMaker.sol";
import { BuyerBurnerCCIPCaller } from "./extensions/BuyerBurnerCCIPCaller.sol";

/// @title SwarmBuyerBurner smart contract (as part of the "SwarmX.eth Protocol")
/// @notice This contract provides functionality to swap and burn ERC20 tokens using Uniswap V3.
/// @dev It leverages Uniswap V3 for token swaps and supports burning a specific token.
contract ChildSwarmBuyerBurner is
    Initializable,
    Ownable,
    BuyerBurnerStorage,
    BuyerBurnerDotcOfferMaker,
    BuyerBurnerCCIPCaller
{
    using SafeTransferLib for address;
    using MetadataReaderLib for address;

    error PriceFeedError(address priceFeed);
    error TokenDecimalsError(address token, uint8 decimals);

    /// @notice Emitted when a `token` is swapped to SMT using WETH9 as an intermediary.
    /// @param amountOut The amount of SMT received.
    event SwappedExactInputMultihop(address indexed token, uint256 amountOut);

    event PoolNotExistsOfferMade(
        uint256 offerId,
        address depositToken,
        uint256 amountIn,
        address withdrawalToken,
        uint256 amountOut
    );

    event ZeroBalance(address indexed token);

    address public backend;

    /// @param uniswapV3Factory The address of the Uniswap V3 factory.
    /// @param uniswapV3Router The address of the Uniswap V3 swap router.
    /// @param weth The address of the WETH9 token.
    /// @param smt The address of the burnable SMT token.
    function initialize(
        DEXType[] calldata dexTypes,
        DexConfig[] calldata configs,
        address[] calldata depositTokens,
        address dotcV2
    ) external initializer {
        __initialize_BuyerBurnerStorage_(dexTypes, configs);
        __initialize_WhitelistedTokens_(depositTokens);
        __initialize_DotcOfferMaker_(dotcV2);

        _setOwner(msg.sender);
    }

    /// @notice Swaps `token` for SMT through WETH9, with the exact input amount.
    /// @dev Requires approval for spending `token`.
    /// @return fullAmountOut The amount of SMT burned.
    function swap(DEXType dexType) external returns (uint256 fullAmountOut) {
        address[] memory _tokens = tokens;
        DexConfig memory config = dexConfigs[dexType];

        for (uint256 i = 0; i < _tokens.length; ++i) {
            uint256 amountIn = _tokens[i].balanceOf(address(this));
            if (amountIn == 0) {
                emit ZeroBalance(_tokens[i]);
                continue; // Skip if no tokens are available for swapping
            }

            bool isWrappedNative = _tokens[i] == config.intermediateToken;

            bytes memory path;

            if (isWrappedNative) {
                path = abi.encodePacked(config.intermediateToken, config.poolFee, config.finalToken);
            } else {
                if (
                    ISwapV3Factory(config.swapV3Factory).getPool(
                        _tokens[i],
                        config.intermediateToken,
                        config.poolFee
                    ) == address(0)
                ) {
                    uint256 amountOut = 1; //TODO: take this 1 from getPrice() that relies on AggregatorV2V3Interface
                    uint256 offerId = _makeOffer(_tokens[i], amountIn, config.finalToken, amountOut);
                    emit PoolNotExistsOfferMade(offerId, _tokens[i], amountIn, config.finalToken, amountOut);

                    // TODO: BE can check allOffers[address(this)] to trigger
                    continue;
                }
                path = abi.encodePacked(
                    _tokens[i],
                    config.poolFee,
                    config.intermediateToken,
                    config.poolFee,
                    config.finalToken
                );
            }

            uint256 amountOutMinimum = IV3SwapQuoter(config.swapV3Quoter).quoteExactInput(path, amountIn);

            // Multiple pool swaps are encoded through bytes called a `path`.
            // A path is a sequence of token addresses and POOL_FEEs that define the pools used in the swaps.
            //
            // The format for pool encoding is (tokenIn, fee, tokenOut/tokenIn, fee, tokenOut)
            // where tokenIn/tokenOut parameter is the shared token across the pools.
            //
            // Since we are swapping `tokens[i]` to WETH9 and then WETH9 to SMT the path encoding
            // is (`tokens[i]`, 0.3%, WETH9, 0.3%, SMT).
            ISwapV3Router.ExactInputParams memory params = ISwapV3Router.ExactInputParams({
                path: path,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum
            });

            uint256 amountOut = ISwapV3Router(config.swapV3Router).exactInput(params);
            fullAmountOut += amountOut;

            emit SwappedExactInputMultihop(tokens[i], amountOut);
        }

        // Withdraw the SMT tokens received from the swap.
        token.safeTransfer(backend, fullAmountOut);
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
    function withdrawTokens(address token, address to, uint256 amount) external onlyOwner {
        token.safeTransfer(to, amount);
    }

    function _toApprove() internal view override returns (address) {
        return UNISWAP_V3_ROUTER;
    }
}
