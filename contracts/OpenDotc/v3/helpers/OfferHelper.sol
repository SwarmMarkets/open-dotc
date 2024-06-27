//SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.25;

import { AssetHelper } from "./AssetHelper.sol";
import { IDotcCompatibleAuthorization } from "../interfaces/IDotcCompatibleAuthorization.sol";
import { Asset, AssetType, OfferStruct, DotcOffer, TakingOfferType, OfferPricingType } from "../structures/DotcStructuresV3.sol";

/// @notice Thrown when an action is attempted on an offer with an expired timestamp.
/// @param timestamp The expired timestamp for the offer.
error OfferExpiredTimestampError(uint256 timestamp);

/// @notice Thrown when a non-special address attempts to take a special offer.
/// @param sender The address that attempts to take a special offer.
error NotSpecialAddressError(address sender);

/// @notice Thrown when a non-authorized address attempts to take a special offer.
/// @param sender The address that attempts to take a special offer.
error NotAuthorizedAccountError(address sender);

/// @notice Thrown when the special address is set to the zero address.
/// @param arrayIndex The index in the array where the zero address was encountered.
error SpecialAddressIsZeroError(uint256 arrayIndex);

/// @notice Thrown when the authoriaztion address is set to the zero address.
/// @param arrayIndex The index in the array where the zero address was encountered.
error AuthAddressIsZeroError(uint256 arrayIndex);

/// @notice Thrown when a partial offer type is attempted with ERC721 or ERC1155 assets, which is unsupported.
error UnsupportedPartialOfferForNonERC20AssetsError();

/// @notice Thrown when the timelock period of an offer is set incorrectly.
/// @param timelock The incorrect timelock period for the offer.
error IncorrectTimelockPeriodError(uint256 timelock);

/// @notice Thrown when an action is attempted on an offer that has already expired.
error OfferExpiredError();

/**
 * @title TODO (as part of the "SwarmX.eth Protocol")
 * @notice It allows for depositing, withdrawing, and managing of assets in the course of trading.
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
 * @dev TODO
 * @author Swarm
 */
library OfferHelper {
    ///@dev Used for Asset interaction
    using AssetHelper for Asset;

    /**
     * @dev Standard decimal places used in Swarm.
     */
    uint256 public constant DECIMALS = 18;

    function buildOffer(
        OfferStruct memory offer,
        Asset calldata depositAsset,
        Asset calldata withdrawalAsset
    ) external view returns (DotcOffer memory dotcOffer) {
        dotcOffer.maker = msg.sender;

        dotcOffer.depositAsset = depositAsset;
        dotcOffer.withdrawalAsset = withdrawalAsset;

        dotcOffer.offer = offer;

        uint256 depositAmount = depositAsset.amount;
        uint256 withdrawalAmount = withdrawalAsset.amount;

        if (offer.offerPricingType == OfferPricingType.FixedPricing) {
            if (offer.takingOfferType == TakingOfferType.PartialTaking) {
                depositAmount = depositAsset.standardize();
                withdrawalAmount = withdrawalAsset.standardize();
            }

            offer.price.unitPrice = (withdrawalAmount * 10 ** DECIMALS) / depositAmount;
        }
    }

    /**
     * @notice Ensures that the offer structure is valid.
     * @dev Checks for asset type, asset address, and amount validity.
     * @param offer The offer to be checked.
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
            checkZeroAddressForSpecialAddresses(offer);
        }

        if (offer.authorizationAddresses.length > 0) {
            checkZeroAddressForAuthAddresses(offer);
        }

        if (
            offer.takingOfferType == TakingOfferType.PartialTaking &&
            (depositAsset.assetType != AssetType.ERC20 || withdrawalAsset.assetType != AssetType.ERC20)
        ) {
            revert UnsupportedPartialOfferForNonERC20AssetsError();
        }
    }

    function checkOfferParams(OfferStruct calldata offer) external view returns (TakingOfferType) {
        if (offer.expiryTimestamp <= block.timestamp) {
            revert OfferExpiredError();
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

        return offer.takingOfferType;
    }

    function checkZeroAddressForSpecialAddresses(OfferStruct calldata offer) public pure {
        for (uint256 i = 0; i < offer.specialAddresses.length; ) {
            if (offer.specialAddresses[i] == address(0)) {
                revert SpecialAddressIsZeroError(i);
            }
            unchecked {
                ++i;
            }
        }
    }

    function checkZeroAddressForAuthAddresses(OfferStruct calldata offer) public pure {
        for (uint256 i = 0; i < offer.authorizationAddresses.length; ) {
            if (offer.authorizationAddresses[i] == address(0)) {
                revert AuthAddressIsZeroError(i);
            }
            unchecked {
                ++i;
            }
        }
    }
}
