// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.19;

import { Initializable } from "solady/src/utils/Initializable.sol";
import { Ownable } from "solady/src/auth/Ownable.sol";
import { SafeTransferLib } from "solady/src/utils/SafeTransferLib.sol";
import { MetadataReaderLib } from "solady/src/utils/MetadataReaderLib.sol";

import { AggregatorV2V3Interface } from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV2V3Interface.sol";

import { IV3SwapFactory } from "./interfaces/IV3SwapFactory.sol";
import { IV3SwapRouter } from "./interfaces/IV3SwapRouter.sol";
import { IV3SwapQuoter } from "./interfaces/IV3SwapQuoter.sol";

// TODO: unify uniswap and pancakeswap, check pools first in uniswap then pancake

import { BuyerBurnerStorage } from "./extensions/BuyerBurnerStorage.sol";
import { WhitelistedTokens } from "./extensions/WhitelistedTokens.sol";
import { DotcOfferMaker } from "./extensions/DotcOfferMaker.sol";

/// @title SwarmBuyerBurner smart contract (as part of the "SwarmX.eth Protocol")
/// @notice This contract provides functionality to swap and burn ERC20 tokens using Uniswap V3.
/// @dev It leverages Uniswap V3 for token swaps and supports burning a specific token.
contract ChildSwarmBuyerBurner is Initializable, Ownable, BuyerBurnerStorage, WhitelistedTokens, DotcOfferMaker {
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
    function swapExactInputMultihop() external returns (uint256 fullAmountOut) {
        address[] memory _tokens = tokens;

        for (uint256 i = 0; i < _tokens.length; ++i) {
            uint256 amountIn = _tokens[i].balanceOf(address(this));
            if (amountIn == 0) {
                emit ZeroBalance(_tokens[i]);
                continue; // Skip if no tokens are available for swapping
            }

            bool isWeth = _tokens[i] == WETH9;

            bytes memory path;

            if (isWeth) {
                path = abi.encodePacked(WETH9, POOL_FEE, SMT);
            } else {
                if (IUniswapV3Factory(UNISWAP_V3_FACTORY).getPool(_tokens[i], WETH9, POOL_FEE) == address(0)) {
                    emit PoolNotExists(_tokens[i]);

                    Asset memory depositAsset = Asset({
                        assetType: AssetType.ERC20,
                        assetAddress: _tokens[i],
                        amount: amountIn,
                        tokenId: 0,
                        assetPrice: AssetPrice(address(0), 0, 0)
                    });

                    Asset memory withdrawalAsset = Asset({
                        assetType: AssetType.ERC20,
                        assetAddress: SMT,
                        amount: 1, //TODO: take from getPrice() that relies on ISMTPriceFeed,
                        tokenId: 0,
                        assetPrice: AssetPrice(address(0), 0, 0)
                    });

                    address[] memory addresses = address[](0);

                    uint256 offerId = dotc.currentOfferId();
                    OfferStruct memory offer = OfferStruct({
                        takingOfferType: TakingOfferType.BlockOffer,
                        offerPrice: OfferPrice(OfferPricingType.FixedPricing, 1, 0, PercentageType.NoType), // TODO: change uintPrice if required
                        specialAddresses: addresses,
                        authorizationAddresses: addresses,
                        expiryTimestamp: 0,
                        timelockPeriod: 0,
                        terms: abi.encode("ChildSwarmBuyerBurner offer N", offerId),
                        commsLink: "Comms" // TODO: ask
                    });

                    // TODO: Create offer on dotc
                    dotc.makeOffer(depositAsset, withdrawalAsset, offer);
                    // TODO: BE can check allOffers[address(this)] to trigger
                    continue; // Skip if the pool does not exist
                }
                path = abi.encodePacked(_tokens[i], POOL_FEE, WETH9, POOL_FEE, SMT);
            }

            uint256 amountOutMinimum = IQuoter(UNISWAP_V3_QUOTER).quoteExactInput(path, amountIn);

            // Multiple pool swaps are encoded through bytes called a `path`.
            // A path is a sequence of token addresses and POOL_FEEs that define the pools used in the swaps.
            //
            // The format for pool encoding is (tokenIn, fee, tokenOut/tokenIn, fee, tokenOut)
            // where tokenIn/tokenOut parameter is the shared token across the pools.
            //
            // Since we are swapping `tokens[i]` to WETH9 and then WETH9 to SMT the path encoding
            // is (`tokens[i]`, 0.3%, WETH9, 0.3%, SMT).
            ISwapRouter.ExactInputParams memory params = ISwapRouter.ExactInputParams({
                path: path,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum
            });

            uint256 amountOut = ISwapRouter(UNISWAP_V3_ROUTER).exactInput(params);
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
    function withdrawTokens(address token, uint256 amount) external onlyOwner {
        token.safeTransfer(to, amount);
    }

    function _toApprove() internal view override returns (address) {
        return UNISWAP_V3_ROUTER;
    }
}
