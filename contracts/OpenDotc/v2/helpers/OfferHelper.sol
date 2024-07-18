// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.25;

import { FixedPointMathLib } from "../exports/ExternalExports.sol";

import { AssetHelper } from "./AssetHelper.sol";

import { IDotcCompatibleAuthorization } from "../interfaces/IDotcCompatibleAuthorization.sol";

import { OfferPrice, AssetPrice, Asset, AssetType, OfferStruct, DotcOffer, TakingOfferType, OfferPricingType, PercentageType, IncorrectPercentage } from "../structures/DotcStructuresV2.sol";

/// @title Errors related to offer management in the Offer Helper library.
/// @notice Provides error messages for various failure conditions related to offer handling.

/// @notice Thrown when an action is attempted on an offer with an expired timestamp.
/// @param timestamp The expired timestamp for the offer.
error OfferExpiredTimestampError(uint256 timestamp);

/// @notice Thrown when a non-special address attempts to take a special offer.
/// @param sender The address that attempts to take a special offer.
error NotSpecialAddressError(address sender);

/// @notice Thrown when a non-authorized address attempts to take a special offer.
/// @param sender The address that attempts to take a special offer.
error NotAuthorizedAccountError(address sender);

/// @notice Thrown when the authorization address is set to the zero address.
/// @param arrayIndex The index in the array where the zero address was encountered.
error AddressIsZeroError(uint256 arrayIndex);

/// @notice Thrown when a partial offer type is attempted with ERC721 or ERC1155 assets, which is unsupported.
error UnsupportedPartialOfferForNonERC20AssetsError();

/// @notice Thrown when the timelock period of an offer is set incorrectly.
/// @param timelock The incorrect timelock period for the offer.
error IncorrectTimelockPeriodError(uint256 timelock);

/// @notice Thrown when an action is attempted on an offer that has already expired.
error OfferExpiredError(uint256 expiredTime);

/// @notice Thrown when the taking offer type is not specified.
error TypesShouldBeSpecified();

/**
 * @title OfferHelper Library (as part of the "SwarmX.eth Protocol")
 * @notice This library provides functions to handle and validate offer operations within the SwarmX.eth Protocol.
 * ////////////////DISCLAIMER////////////////DISCLAIMER////////////////DISCLAIMER////////////////
 * Please read the Disclaimer featured on the SwarmX.eth website ("Terms") carefully before accessing,
 * interacting with, or using the SwarmX.eth Protocol software, consisting of the SwarmX.eth Protocol
 * technology stack (in particular its smart contracts) as well as any other SwarmX.eth technology such
 * as e.g., the launch kit for frontend operators (together the "SwarmX.eth Protocol Software").
 * By using any part of the SwarmX.eth Protocol you agree (1) to the Terms and acknowledge that you are
 * aware of the existing risk and knowingly accept it, (2) that you have read, understood and accept the
 * legal information and terms of service and privacy note presented in the Terms, and (3) that you are
 * neither a US person nor a person subject to international sanctions (in particular as imposed by the
 * European Union, Switzerland, the United Nations, as well as the USA). If you do not meet these
 * requirements, please refrain from using the SwarmX.eth Protocol.
 * ////////////////DISCLAIMER////////////////DISCLAIMER////////////////DISCLAIMER////////////////
 * @dev The library contains functions to ensure proper handling and validity of offers.
 * @author Swarm
 */
library OfferHelper {
    /// @dev Used for precise calculations.
    using FixedPointMathLib for uint256;
    /// @dev Used for Asset interaction.
    using AssetHelper for Asset;

    /**
     * @notice Builds a DOTC offer based on the provided parameters.
     * @param offer The structure containing offer details.
     * @param depositAsset The asset being deposited.
     * @param withdrawalAsset The asset being withdrawn.
     * @return dotcOffer The constructed DOTC offer.
     */
    function buildOffer(
        OfferStruct memory offer,
        Asset calldata depositAsset,
        Asset calldata withdrawalAsset
    ) external view returns (DotcOffer memory dotcOffer) {
        uint256 depositAmount = depositAsset.amount;
        uint256 withdrawalAmount = withdrawalAsset.amount;

        dotcOffer.maker = msg.sender;
        dotcOffer.depositAsset = depositAsset;
        dotcOffer.withdrawalAsset = withdrawalAsset;

        if (offer.offerPrice.offerPricingType == OfferPricingType.FixedPricing) {
            if (offer.takingOfferType == TakingOfferType.PartialOffer) {
                depositAmount = depositAsset.standardize();
                withdrawalAmount = withdrawalAsset.standardize();
            }

            offer.offerPrice.unitPrice = withdrawalAmount.fullMulDiv(AssetHelper.BPS, depositAmount);
            offer.offerPrice.percentage = 0;
            offer.offerPrice.percentageType = PercentageType.NoType;
        } else {
            (uint256 depositToWithdrawalRate, uint256 price) = depositAsset.getRateAndPrice(
                withdrawalAsset,
                offer.offerPrice
            );

            offer.offerPrice.unitPrice = depositToWithdrawalRate;

            dotcOffer.withdrawalAsset.amount = price;
        }

        dotcOffer.offer = offer;
    }

    /**
     * @notice Ensures that the offer structure is valid.
     * @dev Checks for asset type, asset address, and amount validity.
     * @param offer The offer to be checked.
     * @param depositAsset The asset being deposited.
     * @param withdrawalAsset The asset being withdrawn.
     */
    function checkOfferStructure(
        OfferStruct calldata offer,
        Asset calldata depositAsset,
        Asset calldata withdrawalAsset
    ) external view {
        if (offer.expiryTimestamp <= block.timestamp) {
            revert OfferExpiredTimestampError(offer.expiryTimestamp);
        }
        if (
            offer.timelockPeriod > 0 &&
            (offer.timelockPeriod <= block.timestamp || offer.timelockPeriod >= offer.expiryTimestamp)
        ) {
            revert IncorrectTimelockPeriodError(offer.timelockPeriod);
        }

        if (offer.specialAddresses.length > 0) {
            checkAddressesArrayForZeroAddresses(offer.specialAddresses);
        }

        if (offer.authorizationAddresses.length > 0) {
            checkAddressesArrayForZeroAddresses(offer.authorizationAddresses);
        }

        if (
            offer.takingOfferType == TakingOfferType.NoType ||
            offer.offerPrice.offerPricingType == OfferPricingType.NoType
        ) {
            revert TypesShouldBeSpecified();
        }

        if (
            offer.takingOfferType == TakingOfferType.PartialOffer &&
            (depositAsset.assetType != AssetType.ERC20 || withdrawalAsset.assetType != AssetType.ERC20)
        ) {
            revert UnsupportedPartialOfferForNonERC20AssetsError();
        }
    }

    /**
     * @notice Ensures that the offer parameters are valid for taking the offer.
     * @dev Checks for offer expiration, special address authorization, and account authorization.
     * @param offer The offer to be checked.
     */
    function checkOfferParams(OfferStruct calldata offer) external view {
        if (offer.expiryTimestamp <= block.timestamp) {
            revert OfferExpiredError(offer.expiryTimestamp);
        }

        if (offer.specialAddresses.length > 0) {
            bool isSpecialTaker = false;
            for (uint256 i = 0; i < offer.specialAddresses.length; ) {
                if (offer.specialAddresses[i] == msg.sender) {
                    isSpecialTaker = true;
                    break;
                }
                unchecked {
                    ++i;
                }
            }

            if (!isSpecialTaker) {
                revert NotSpecialAddressError(msg.sender);
            }
        }

        if (offer.authorizationAddresses.length > 0) {
            bool isAccountAuthorized = false;
            for (uint256 i = 0; i < offer.authorizationAddresses.length; ) {
                if (IDotcCompatibleAuthorization(offer.authorizationAddresses[i]).isAccountAuthorized(msg.sender)) {
                    isAccountAuthorized = true;
                    break;
                }
                unchecked {
                    ++i;
                }
            }

            if (!isAccountAuthorized) {
                revert NotAuthorizedAccountError(msg.sender);
            }
        }
    }

    /**
     * @notice Checks an array of addresses for zero addresses.
     * @dev Reverts if any address in the array is the zero address.
     * @param addressesArray The array of addresses to be checked.
     */
    function checkAddressesArrayForZeroAddresses(address[] calldata addressesArray) public pure {
        for (uint256 i = 0; i < addressesArray.length; ) {
            if (addressesArray[i] == address(0)) {
                revert AddressIsZeroError(i);
            }
            unchecked {
                ++i;
            }
        }
    }
}
