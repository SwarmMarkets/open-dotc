//SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.25;

import { ERC1155HolderUpgradeable, ERC721HolderUpgradeable } from "./exports/Exports.sol";

import { AssetHelper } from "./helpers/AssetHelper.sol";
import { OfferHelper } from "./helpers/OfferHelper.sol";
import { DotcOfferHelper } from "./helpers/DotcOfferHelper.sol";
import { DotcEscrowV3 } from "./DotcEscrowV3.sol";

import { Asset, AssetType, OfferPricingType, TakingOfferType, EscrowCallType, ValidityType, OfferStruct, DotcOffer, IncorrectTimelockPeriodError } from "./structures/DotcStructuresV3.sol";

/// @title Errors related to the Dotc contract
/// @notice Provides error messages for various failure conditions related to Offers and Assets handling

/// @notice Thrown when an action is attempted on an offer that has already expired.
/// @param offerId The ID of the offer associated with the error.
error OfferExpiredError(uint256 offerId);

/// @notice Thrown when the call to escrow fails.
/// @param _type The type of escrow call that failed.
error EscrowCallFailedError(EscrowCallType _type);

/// @notice Thrown when the calculated fee amount is zero or less.
error FeeAmountIsZeroError();

/// @notice Thrown when the amount to pay, excluding fees, is zero or less.
error AmountWithoutFeesIsZeroError();

/// @notice Thrown when the amount to send does not match the required amount for a full offer.
/// @param providedAmount The incorrect amount provided for the full offer.
error IncorrectFullOfferAmountError(uint256 providedAmount);

/// @notice Thrown when there's an attempt to change the amount of an ERC721 offer.
error ERC721OfferAmountChangeError();

/**
 * @title Open Dotc smart contract (as part of the "SwarmX.eth Protocol")
 * @notice This contract handles decentralized over-the-counter trading.
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
 * @dev It uses ERC1155 and ERC721 token standards for asset management and trade settlement.
 * @author Swarm
 */
contract DotcV3 is ERC1155HolderUpgradeable, ERC721HolderUpgradeable {
    ///@dev Used for Asset interaction
    using AssetHelper for Asset;
    ///@dev Used for Offer interaction
    using OfferHelper for OfferStruct;
    ///@dev Used for Dotc Offer interaction
    using DotcOfferHelper for DotcOffer;

    /**
     * @notice Emitted when a new trading offer is created.
     * @param maker Address of the user creating the offer.
     * @param offerId Unique identifier of the created offer.
     * @param depositAsset Asset to be deposited by the maker.
     * @param withdrawalAsset Asset to be withdrawn by the maker.
     * @param offer TODO
     */
    event CreatedOffer(
        address indexed maker,
        uint256 indexed offerId,
        Asset depositAsset,
        Asset withdrawalAsset,
        OfferStruct offer
        // TODO: Min/Max dynamic amount
    );
    /**
     * @notice Emitted when an offer is successfully taken.
     * @param offerId Unique identifier of the taken offer.
     * @param takenBy Address of the user taking the offer.
     * @param validityType Indicates if the offer is fully taken.
     * @param amountToReceive Amount received in the trade.
     * @param amountPaid Amount paid to take the offer.
     */
    event TakenOffer(
        uint256 indexed offerId,
        address indexed takenBy,
        ValidityType indexed validityType,
        uint256 amountToReceive,
        uint256 amountPaid
        // TODO: rev share amount
        // TODO: Affiliate address
    );
    /**
     * @notice Emitted when an offer is canceled.
     * @param offerId Unique identifier of the canceled offer.
     * @param canceledBy Address of the user who canceled the offer.
     * @param amountToReceive Amount that was to be received from the offer.
     */
    event CanceledOffer(uint256 indexed offerId, address indexed canceledBy, uint256 amountToReceive);
    /**
     * @notice Emitted when an existing offer is updated.
     * @param offerId Unique identifier of the updated offer.
     * @param newOffer Details of the new offer.
     */
    event OfferAmountUpdated(uint256 indexed offerId, uint256 newOffer);
    /**
     * @notice Emitted when the expiry time of an offer is updated.
     * @param offerId Unique identifier of the offer with updated expiry.
     * @param newExpiryTimestamp The new expiry timestamp of the offer.
     */
    event UpdatedOfferExpiry(uint256 indexed offerId, uint256 newExpiryTimestamp);
    /**
     * @notice Emitted when the timelock period of an offer is updated.
     * @param offerId Unique identifier of the offer with updated timelock.
     * @param newTimelockPeriod The new timelock period of the offer.
     */
    event UpdatedTimeLockPeriod(uint256 indexed offerId, uint256 newTimelockPeriod);
    /**
     * @notice Emitted when the Term and Comms links for an offer is updated.
     * @param offerId Unique identifier of the offer with updated links.
     * @param newTerms The new terms for the offer.
     * @param newCommsLink The new comms link for the offer.
     */
    event OfferLinksUpdated(uint256 indexed offerId, string newTerms, string newCommsLink);
    /**
     * @notice Emitted when the array of special addresses of an offer is udpated.
     * @param offerId Unique identifier of the offer with updated links.
     * @param specialAddresses The new special addresses of the offer.
     */
    event OfferSpecialAddressesUpdated(uint256 indexed offerId, address[] specialAddresses);
    /**
     * @notice Emitted when the array of special addresses of an offer is udpated.
     * @param offerId Unique identifier of the offer with updated links.
     * @param authAddresses The new auth addresses of the offer.
     */
    event OfferAuthAddressesUpdated(uint256 indexed offerId, address[] authAddresses);

    /**
     * @dev Address of the escrow contract.
     */
    DotcEscrowV3 public escrow;
    /**
     * @notice Stores all the offers ever created.
     * @dev Maps an offer ID to its corresponding DotcOffer structure.
     */
    mapping(uint256 => DotcOffer) public allOffers;
    /**
     * @notice Keeps track of all offers created by a specific address.
     * @dev Maps an address to an array of offer IDs created by that address.
     */
    mapping(address => uint256[]) public offersFromAddress;
    /**
     * @notice Tracks the ID to be assigned to the next created offer.
     * @dev Incremented with each new offer, ensuring unique IDs for all offers.
     */
    uint256 public currentOfferId;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the contract with a given escrow.
     * @dev Sets up the reentrancy guard and ERC token holder functionalities.
     * @param _escrow The address of the escrow to be set for this contract.
     */
    function initialize(DotcEscrowV3 _escrow) public initializer {
        __ERC1155Holder_init();
        __ERC721Holder_init();

        escrow = _escrow;
    }

    /**
     * @notice Creates a new trading offer with specified assets and conditions.
     * @param depositAsset The asset to be deposited by the maker.
     * @param withdrawalAsset The asset desired by the maker in exchange.
     * @param offer Offer Struct.
     * @dev Validates asset structure and initializes a new offer.
     */
    function makeOffer(
        Asset calldata depositAsset,
        Asset calldata withdrawalAsset,
        OfferStruct calldata offer
    ) external {
        depositAsset.checkAssetStructure();
        withdrawalAsset.checkAssetStructure();
        offer.checkOfferStructure(depositAsset, withdrawalAsset);

        uint256 _currentOfferId = currentOfferId;

        DotcOffer memory _offer = offer.buildOffer(depositAsset, withdrawalAsset);

        currentOfferId++;
        offersFromAddress[msg.sender].push(_currentOfferId);
        allOffers[_currentOfferId] = _offer;

        // Sending DepositAsset from Maker to Escrow
        depositAsset.assetTransfer(msg.sender, address(escrow), depositAsset.amount);

        if (!escrow.setDeposit(_currentOfferId, msg.sender, depositAsset)) {
            revert EscrowCallFailedError(EscrowCallType.Deposit);
        }

        emit CreatedOffer(msg.sender, _currentOfferId, depositAsset, withdrawalAsset, offer);
    }

    /**
     * @notice Allows a user to take an available offer.
     * @dev Ensures the current time is before the offer's expiry time.
     * @param offerId The ID of the offer to take.
     * @param amountToSend The amount of the withdrawal asset to send.
     * @dev Handles the transfer of assets between maker and taker.
     */
    function takeOffer(uint256 offerId, uint256 amountToSend) public {
        DotcOffer memory offer = allOffers[offerId];
        offer.checkDotcOfferValidity();
        offer.checkDotcOfferParams();

        if (offer.offer.expiryTimestamp <= block.timestamp) {
            revert OfferExpiredError(offerId);
        }

        offer.offer.checkOfferAddresses();

        uint256 amountToWithdraw = offer.depositAsset.amount;
        uint256 realAmount = amountToWithdraw;

        uint256 feesAmount;
        ValidityType validityType;

        if (offer.withdrawalAsset.checkAssetOwner(msg.sender, amountToSend) == AssetType.ERC20) {
            uint256 standardizedAmount = offer.withdrawalAsset.standardizeNumber(amountToSend);

            feesAmount = (amountToSend * escrow.feeAmount()) / AssetHelper.BPS;
            uint256 amountToPay = amountToSend - feesAmount;

            if (feesAmount == 0) {
                revert FeeAmountIsZeroError();
            }
            if (amountToPay == 0) {
                revert AmountWithoutFeesIsZeroError();
            }

            if (offer.offer.takingOfferType == TakingOfferType.FullyTaking) {
                if (standardizedAmount != offer.withdrawalAsset.amount) {
                    revert IncorrectFullOfferAmountError(standardizedAmount);
                }

                validityType = _fullyTakeOffer(allOffers[offerId]);
            } else {
                (amountToWithdraw, realAmount, validityType) = _partiallyTakeOffer(
                    allOffers[offerId],
                    standardizedAmount,
                    amountToWithdraw
                );
            }

            // Send fees from taker to `feeReceiver`
            offer.withdrawalAsset.assetTransfer(msg.sender, escrow.feeReceiver(), feesAmount);

            // Sending Withdrawal Asset from Taker to Maker
            offer.withdrawalAsset.assetTransfer(msg.sender, offer.maker, amountToPay);
        } else {
            validityType = _fullyTakeOffer(allOffers[offerId]);

            if (offer.depositAsset.assetType == AssetType.ERC20) {
                feesAmount = (offer.depositAsset.amount * escrow.feeAmount()) / AssetHelper.BPS;

                amountToWithdraw -= feesAmount;

                if (!escrow.withdrawFees(offerId, feesAmount)) {
                    revert EscrowCallFailedError(EscrowCallType.WithdrawFees);
                }
            }

            // Sending Withdrawal Asset from Taker to Maker
            offer.withdrawalAsset.assetTransfer(msg.sender, offer.maker, offer.withdrawalAsset.amount);
        }

        // Sending Deposit Asset from Escrow to Taker
        if (!escrow.withdrawDeposit(offerId, amountToWithdraw, msg.sender)) {
            revert EscrowCallFailedError(EscrowCallType.Withdraw);
        }

        emit TakenOffer(offerId, msg.sender, validityType, realAmount, amountToSend);
    }

    /**
     * @notice Cancels an offer and refunds the maker.
     * @param offerId The ID of the offer to cancel.
     * @dev Can only be called by the offer's maker and when the timelock has passed.
     */
    function cancelOffer(uint256 offerId) external {
        DotcOffer memory offer = allOffers[offerId];

        offer.checkDotcOfferValidity();
        offer.checkDotcOfferParams();

        delete allOffers[offerId];

        (bool success, uint256 amountToWithdraw) = escrow.cancelDeposit(offerId, msg.sender);

        if (!success) {
            revert EscrowCallFailedError(EscrowCallType.Cancel);
        }

        emit CanceledOffer(offerId, msg.sender, amountToWithdraw);
    }

    /**
     * @notice Updates an existing offer's details.
     * @param offerId The ID of the offer to update.
     * @param newAmount New amount for the withdrawal asset.
     * @param updatedOffer A structure for the update the offer.
     * @return status Boolean indicating the success of the operation.
     * @dev Only the maker of the offer can update it.
     */
    function updateOffer(
        uint256 offerId,
        uint256 newAmount,
        OfferStruct calldata updatedOffer
    ) external returns (bool status) {
        DotcOffer memory offer = allOffers[offerId];

        offer.checkDotcOfferValidity();
        offer.checkDotcOfferParams();

        if (newAmount > 0) {
            if (offer.withdrawalAsset.assetType == AssetType.ERC721) {
                revert ERC721OfferAmountChangeError();
            }
            uint256 standardizedNewAmount = offer.withdrawalAsset.assetType == AssetType.ERC20
                ? offer.withdrawalAsset.standardizeNumber(newAmount)
                : newAmount;

            allOffers[offerId].withdrawalAsset.amount = standardizedNewAmount;
            allOffers[offerId].unitPrice = (standardizedNewAmount * 10 ** OfferHelper.DECIMALS) / offer.availableAmount;

            emit OfferAmountUpdated(offerId, newAmount);
        }

        if (updatedOffer.specialAddresses.length > 0) {
            updatedOffer.checkZeroAddressForSpecialAddresses();

            allOffers[offerId].offer.specialAddresses = updatedOffer.specialAddresses;
            emit OfferSpecialAddressesUpdated(offerId, updatedOffer.specialAddresses);
        }

        if (updatedOffer.authorizationAddresses.length > 0) {
            updatedOffer.checkZeroAddressForAuthAddresses();

            allOffers[offerId].offer.authorizationAddresses = updatedOffer.authorizationAddresses;
            emit OfferAuthAddressesUpdated(offerId, updatedOffer.authorizationAddresses);
        }

        if (
            keccak256(abi.encodePacked(updatedOffer.terms)) != keccak256("") &&
            keccak256(abi.encodePacked(updatedOffer.commsLink)) != keccak256("")
        ) {
            allOffers[offerId].offer.terms = updatedOffer.terms;
            allOffers[offerId].offer.commsLink = updatedOffer.commsLink;
            emit OfferLinksUpdated(offerId, updatedOffer.terms, updatedOffer.commsLink);
        }

        if (updatedOffer.expiryTimestamp > offer.offer.expiryTimestamp) {
            allOffers[offerId].offer.expiryTimestamp = updatedOffer.expiryTimestamp;
            emit UpdatedOfferExpiry(offerId, updatedOffer.expiryTimestamp);
        }

        return true;
    }

    /**
     * @notice Retrieves all offers made by a specific address.
     * @param account The address to query offers for.
     * @return A list of offer IDs created by the given account.
     */
    function getOffersFromAddress(address account) external view returns (uint256[] memory) {
        return offersFromAddress[account];
    }

    /**
     * @notice Gets the owner (maker) of a specific offer.
     * @param offerId The ID of the offer.
     * @return maker The address of the offer's maker.
     */
    function getOfferOwner(uint256 offerId) external view returns (address maker) {
        maker = allOffers[offerId].maker;
    }

    /**
     * @notice Retrieves details of a specific offer.
     * @param offerId The ID of the offer to retrieve.
     * @return offer The details of the specified offer.
     */
    function getOffer(uint256 offerId) external view returns (DotcOffer memory offer) {
        return allOffers[offerId];
    }

    /**
     * @notice Checks if the contract supports a specific interface.
     * @param interfaceId The interface identifier to check.
     * @return True if the interface is supported.
     * @dev Overridden to support ERC1155Receiver interfaces.
     */
    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    // Internal function to handle the full taking of an offer.
    function _fullyTakeOffer(DotcOffer storage offer) private returns (ValidityType validityType) {
        validityType = ValidityType.FullyTaken;

        offer.withdrawalAsset.amount = 0;
        offer.availableAmount = 0;
        offer.validityType = validityType;
    }

    // Internal function to handle the partial taking of an offer.
    function _partiallyTakeOffer(
        DotcOffer storage offer,
        uint256 standardizedAmount,
        uint256 amountToWithdraw
    ) private returns (uint256 amount, uint256 realAmount, ValidityType validityType) {
        DotcOffer memory _offer = offer;

        if (standardizedAmount == _offer.withdrawalAsset.amount) {
            amountToWithdraw = _offer.availableAmount;
            offer.withdrawalAsset.amount = 0;
            offer.availableAmount = 0;
        } else {
            amountToWithdraw = (standardizedAmount * 10 ** OfferHelper.DECIMALS) / _offer.unitPrice;

            offer.withdrawalAsset.amount -= standardizedAmount;
            offer.availableAmount -= amountToWithdraw;
        }

        validityType = (offer.withdrawalAsset.amount == 0 || offer.availableAmount == 0)
            ? ValidityType.FullyTaken
            : validityType = ValidityType.PartiallyTaken;

        offer.validityType = validityType;
        amount = amountToWithdraw;
        realAmount = _offer.depositAsset.unstandardizeNumber(amount);
    }
}
