// solhint-disable
//SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.24;

import { Asset, AssetType } from "./DotcStructures.sol";

/**
 * @title Structures for DOTC management (as part of the "SwarmX.eth Protocol")
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
 * @author Swarm
 */

/**
 * @title Escrow Call Type Enum
 * @notice Defines the different types of calls that can be made to the escrow in the DOTC system.
 * @dev Enum representing various escrow call types such as deposit, withdraw, and cancel operations.
 * - Deposit: Represents a call to deposit assets into escrow.
 * - Withdraw: Represents a call to withdraw assets from escrow.
 * - Cancel: Represents a call to cancel an operation in the escrow.
 * @author Swarm
 */
enum EscrowCallType {
    Deposit,
    Withdraw,
    Cancel
}

/**
 * @title Validity Type Enum
 * @notice Defines the types of validity states an offer can have in the DOTC system.
 * @dev Enum representing different states of offer validity, like non-existent or fully taken.
 * - NotExist: Indicates the offer does not exist.
 * - FullyTaken: Indicates the offer has been fully taken.
 * @author Swarm
 */
enum ValidityType {
    NotExist,
    FullyTaken
}

/**
 * @title Time Constraint Type Enum
 * @notice Defines the types of time constraints an offer can have in the DOTC system.
 * @dev Enum representing different time-related constraints for offers.
 * - Expired: Indicates the offer has expired.
 * - TimelockGreaterThanExpirationTime: Indicates the timelock is greater than the offer's expiration time.
 * - InTimelock: Indicates the offer is currently in its timelock period.
 * - IncorrectTimelock: Indicates an incorrect setting of the timelock period.
 * @author Swarm
 */
enum TimeConstraintType {
    Expired,
    TimelockGreaterThanExpirationTime,
    InTimelock,
    IncorrectTimelock
}

/**
 * @title Offer Struct for DOTC
 * @notice Describes the structure of an offer within the DOTC trading system.
 * @dev Structure encapsulating details of an offer, including its type, special conditions, and timing constraints.
 * @param isFullType Boolean indicating if the offer is for the full amount of the deposit asset.
 * @param specialAddresses Array of addresses with exclusive rights to take the offer.
 * @param expiryTimestamp Unix timestamp marking the offer's expiration.
 * @param timelockPeriod Duration in seconds for which the offer is locked from being taken.
 * @param terms String URL pointing to the terms associated with the offer.
 * @param commsLink String URL providing a communication link (e.g., Telegram, email) for discussing the offer.
 * @author Swarm
 */
struct OfferStruct {
    bool isFullType;
    address[] specialAddresses;
    uint256 expiryTimestamp;
    uint256 timelockPeriod;
    string terms;
    string commsLink;
}

/**
 * @title DOTC Offer Structure
 * @notice Detailed structure of an offer in the DOTC trading system.
 * @dev Contains comprehensive information about an offer, including assets involved and trade conditions.
 * @param maker Address of the individual creating the offer.
 * @param isFullyTaken Boolean indicating whether the offer has been completely accepted.
 * @param depositAsset Asset offered by the maker.
 * @param withdrawalAsset Asset requested by the maker in exchange.
 * @param availableAmount Quantity of the deposit asset available for trade.
 * @param unitPrice Price per unit of the deposit asset in terms of the withdrawal asset.
 * @param offer Detailed structure of the offer including special conditions and timing.
 * @author Swarm
 */
struct DotcOffer {
    address maker;
    bool isFullyTaken;
    uint256 availableAmount;
    uint256 unitPrice;
    Asset depositAsset;
    Asset withdrawalAsset;
    OfferStruct offer;
}
