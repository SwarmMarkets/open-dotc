//SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.25;

import { DotcOffer, ValidityType } from "../structures/DotcStructuresV3.sol";

/// @notice Thrown when an offer encounters a validity-related issue.
/// @param validityType The type of validity error encountered, represented as an enum of `ValidityType`.
error OfferValidityError(ValidityType validityType);

/// @notice Thrown when a non-maker tries to perform an action on their own offer.
/// @param maker The address of the offer's maker.
error OnlyMakerAllowedError(address maker);

/// @notice Thrown when an action is attempted on an offer that is still within its timelock period.
error OfferInTimelockError();

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
library DotcOfferHelper {
    /**
     * @notice Ensures that the offer is valid and available.
     * @dev Checks if the offer exists and has not been fully taken.
     * @param offer The offer to be checked.
     */
    function checkDotcOfferValidity(DotcOffer calldata offer) external pure {
        if (offer.maker == address(0)) {
            revert OfferValidityError(offer.validityType);
        }
        if (offer.validityType == ValidityType.FullyTaken) {
            revert OfferValidityError(offer.validityType);
        }
    }

    /**
     * @notice Ensures that the caller to the offer is maker of this offer.
     * Ensures that the timelock period of the offer has passed.
     * @dev Checks if the offer exists and has not been fully taken.
     * Checks if the current time is beyond the offer's timelock period.
     * @param offer The offer to be checked.
     */
    function checkDotcOfferParams(DotcOffer calldata offer) external view {
        if (offer.maker != msg.sender) {
            revert OnlyMakerAllowedError(offer.maker);
        }

        if (offer.offer.timelockPeriod >= block.timestamp) {
            revert OfferInTimelockError();
        }
    }
}
