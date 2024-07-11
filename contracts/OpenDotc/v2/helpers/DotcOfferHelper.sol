// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.25;

import { DotcOffer, ValidityType } from "../structures/DotcStructuresV2.sol";

/// @title Errors related to dotc offer management in the Dotc Offer Helper library.
/// @notice Provides error messages for various failure conditions related to dotc offer handling.

/// @notice Thrown when an offer encounters a validity-related issue.
/// @param validityType The type of validity error encountered, represented as an enum of `ValidityType`.
error OfferValidityError(ValidityType validityType);

/// @notice Thrown when a non-maker tries to perform an action on their own offer.
/// @param maker The address of the offer's maker.
error OnlyMakerAllowedError(address maker);

/// @notice Thrown when an action is attempted on an offer that is still within its timelock period.
error OfferInTimelockError(uint256 currentUnixTime);

/**
 * @title DotcOfferHelper Library (as part of the "SwarmX.eth Protocol")
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
library DotcOfferHelper {
    /**
     * @notice Ensures that the offer parameters are valid and that the offer can be interacted with.
     * @dev Checks if the offer exists and has not been fully taken or cancelled.
     *      Verifies that the current time is beyond the offer's timelock period.
     * @param offer The offer to be checked.
     */
    function checkDotcOfferParams(DotcOffer calldata offer) external view {
        if (
            offer.maker == address(0) ||
            offer.validityType == ValidityType.FullyTaken ||
            offer.validityType == ValidityType.Cancelled
        ) {
            revert OfferValidityError(offer.validityType);
        }

        if (offer.offer.timelockPeriod >= block.timestamp) {
            revert OfferInTimelockError(block.timestamp);
        }
    }

    /**
     * @notice Ensures that the caller is the maker of the offer.
     * @param offer The offer to check the maker against.
     */
    function onlyMaker(DotcOffer calldata offer) external view {
        if (offer.maker != msg.sender) {
            revert OnlyMakerAllowedError(offer.maker);
        }
    }
}
