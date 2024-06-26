//SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.25;

import { ERC1155HolderUpgradeable, ERC721HolderUpgradeable, IERC20, IERC721, IERC1155, IERC165, SafeERC20 } from "./exports/Exports.sol";

import { AssetHelper } from "./helpers/AssetHelper.sol";
import { OfferHelper } from "./helpers/OfferHelper.sol";
import { DotcOfferHelper } from "./helpers/DotcOfferHelper.sol";
import { DotcEscrowV3 } from "./DotcEscrowV3.sol";
import { UnsupportedAssetType } from "./structures/DotcStructuresV3.sol";

import { Asset, AssetType, OfferPricingType, TakingOfferType, ValidityType, OfferStruct, DotcOffer } from "./structures/DotcStructuresV3.sol";

/// @title Errors related to the Dotc contract
/// @notice Provides error messages for various failure conditions related to Offers and Assets handling

/// @notice Thrown when the call to escrow fails.
error EscrowCallFailedError();

/// @notice Thrown when the amount to pay, excluding fees, is zero or less.
error AmountWithoutFeesIsZeroError();

/// @notice Thrown when the amount to send does not match the required amount for a full offer.
/// @param providedAmount The incorrect amount provided for the full offer.
error IncorrectFullOfferAmountError(uint256 providedAmount);

/// @notice Thrown when there's an attempt to change the amount of an ERC721 offer.
error ERC721OfferAmountChangeError();

/// @notice Indicates that the operation was attempted by an unauthorized entity, not the Escrow contract
error OnlyEscrow();

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
    ///@dev Used for Safe transfer tokens
    using SafeERC20 for IERC20;
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
     * @dev Emitted when the escrow address is changed.
     * @param by Address of the user who changed the escrow address.
     * @param escrow New escrow's address.
     */
    event EscrowAddressSet(address indexed by, DotcEscrowV3 escrow);

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

    /**
     * @notice Ensures that the function is only callable by the Escrow contract.
     * @dev Modifier that restricts function access to the address of the Escrow contract.
     */
    modifier onlyEscrow() {
        if (msg.sender != address(escrow)) {
            revert OnlyEscrow();
        }
        _;
    }

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

        depositAsset.checkAssetOwner(msg.sender);

        offer.checkOfferStructure(depositAsset, withdrawalAsset);

        uint256 _currentOfferId = currentOfferId;

        DotcOffer memory _offer = offer.buildOffer(depositAsset, withdrawalAsset);

        currentOfferId++;
        offersFromAddress[msg.sender].push(_currentOfferId);
        allOffers[_currentOfferId] = _offer;

        // Sending DepositAsset from Maker to Escrow
        _assetTransfer(depositAsset, msg.sender, address(escrow), depositAsset.amount);

        escrow.setDeposit(_currentOfferId, msg.sender, depositAsset);

        emit CreatedOffer(msg.sender, _currentOfferId, depositAsset, withdrawalAsset, offer);
    }

    /**
     * @notice Allows a user to take an available offer.
     * @dev Ensures the current time is before the offer's expiry time.
     * @param offerId The ID of the offer to take.
     * @param amountToSend The amount of the withdrawal asset to send.
     * @dev Handles the transfer of assets between maker and taker.
     */
    function takePartialOffer(uint256 offerId, uint256 amountToSend) public {
        DotcOffer memory offer = allOffers[offerId];
        offer.checkDotcOfferParams();

        TakingOfferType takingOfferType = offer.offer.checkOfferParams();

        if (takingOfferType != TakingOfferType.PartialTaking) {
            revert OfferCanNotBePartiallyTaken(offerId);
        }

        if (amountToSend == 0) {
            revert PartialOfferShouldHaveSpecifiedAmount();
        }

        uint256 depositAssetAmount = offer.depositAsset.amount;
        uint256 withdrawalAssetAmount = offer.withdrawalAsset.amount;

        uint256 standardizedAmount = offer.withdrawalAsset.standardize(amountToSend);

        if (standardizedAmount == withdrawalAssetAmount) {
            depositAssetAmount = offer.availableAmount;
            allOffers[offerId].withdrawalAsset.amount = 0;
            allOffers[offerId].availableAmount = 0;
        } else {
            depositAssetAmount = (standardizedAmount * 10 ** OfferHelper.DECIMALS) / offer.unitPrice;
            allOffers[offerId].withdrawalAsset.amount -= standardizedAmount;
            allOffers[offerId].availableAmount -= depositAssetAmount;
        }

        validityType = (allOffers[offerId].withdrawalAsset.amount == 0 || allOffers[offerId].availableAmount == 0)
            ? ValidityType.FullyTaken
            : ValidityType.PartiallyTaken;

        allOffers[offerId].validityType = validityType;
        withdrawalAssetAmount = amountToSend;

        //TODO: finish
    }

    function takeFullOffer(uint256 offerId) public {
        DotcOffer memory offer = allOffers[offerId];
        offer.checkDotcOfferParams();

        TakingOfferType takingOfferType = offer.offer.checkOfferParams();

        if (takingOfferType != TakingOfferType.FullyTaking) {
            revert OfferCanNotBeFullyTaken(offerId);
        }

        uint256 depositAssetAmount = offer.depositAsset.amount;
        uint256 withdrawalAssetAmount = offer.withdrawalAsset.amount;

        ValidityType validityType = ValidityType.FullyTaken;
        allOffers[offerId].withdrawalAsset.amount = 0;
        allOffers[offerId].availableAmount = 0;
        allOffers[offerId].validityType = validityType;

        //TODO: implement unstandartization / Or add private functions for different assets

        // If WithdrawalAsset is not an ERC20 then fees will be taken from Maker
        // If WithdrawalAsset is an ERC20 then fees will be taken from Taker
        if (offer.withdrawalAsset.checkAssetOwner(msg.sender, withdrawalAssetAmount) != AssetType.ERC20) {
            if (offer.depositAsset.assetType == AssetType.ERC20) {
                uint256 feesAmount = _calculateFees(depositAssetAmount);
                depositAssetAmount -= feesAmount;

                escrow.withdrawFees(offerId, feesAmount);
            }
        } else {
            withdrawalAssetAmount -= _sendWithdrawalFees(withdrawalAssetAmount);
        }

        //Transfer WithdrawalAsset from Taker to Maker
        _assetTransfer(offer.withdrawalAsset, msg.sender, offer.maker, withdrawalAssetAmount);

        //Transfer DepositAsset from Maker to Taker
        escrow.withdrawDeposit(offerId, depositAssetAmount, msg.sender);

        emit TakenOffer(offerId, msg.sender, validityType, depositAssetAmount, withdrawalAssetAmount);
    }

    function _takeOffer(uint256 offerId, uint256 amountToSend) private {
        DotcOffer memory offer = allOffers[offerId];
        offer.checkDotcOfferParams();

        TakingOfferType takingOfferType = offer.offer.checkOfferParams();
        uint256 depositAssetAmount = offer.depositAsset.amount;
        uint256 withdrawalAssetAmount = offer.withdrawalAsset.amount;
        ValidityType validityType;

        if (takingOfferType == TakingOfferType.PartialTaking && amountToSend != 0) {} else {
            validityType = ValidityType.FullyTaken;
            allOffers[offerId].withdrawalAsset.amount = 0;
            allOffers[offerId].availableAmount = 0;
            allOffers[offerId].validityType = validityType;

            if (offer.withdrawalAsset.checkAssetOwner(msg.sender, withdrawalAssetAmount) != AssetType.ERC20) {
                if (offer.depositAsset.assetType == AssetType.ERC20) {
                    uint256 feesAmount = (offer.depositAsset.amount * escrow.feeAmount()) / OfferHelper.DECIMALS;
                    depositAssetAmount -= feesAmount;
                    escrow.withdrawFees(offerId, feesAmount);
                }
            }
        }

        _transferAssets(offer, msg.sender, withdrawalAssetAmount, escrow.feeReceiver(), escrow.feeAmount());

        escrow.withdrawDeposit(offerId, depositAssetAmount, msg.sender);

        emit TakenOffer(offerId, msg.sender, validityType, depositAssetAmount, withdrawalAssetAmount);
    }

    /**
     * @notice Cancels an offer and refunds the maker.
     * @param offerId The ID of the offer to cancel.
     * @dev Can only be called by the offer's maker and when the timelock has passed.
     */
    function cancelOffer(uint256 offerId) external {
        DotcOffer memory offer = allOffers[offerId];

        offer.onlyMaker();
        offer.checkDotcOfferParams();

        delete allOffers[offerId];

        uint256 amountToWithdraw = escrow.cancelDeposit(offerId, msg.sender);

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

        offer.onlyMaker();
        offer.checkDotcOfferParams();

        if (newAmount > 0) {
            if (offer.withdrawalAsset.assetType == AssetType.ERC721) {
                revert ERC721OfferAmountChangeError();
            }
            uint256 standardizedNewAmount = offer.withdrawalAsset.assetType == AssetType.ERC20
                ? offer.withdrawalAsset.standardize(newAmount)
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
     * @notice Changes the escrow address.
     * @param _escrow The new escrow's address.
     * @dev Ensures that only the current owner can perform this operation.
     */
    function changeEscrow(DotcEscrowV3 _escrow) external onlyEscrow {
        escrow = _escrow;

        emit EscrowAddressSet(msg.sender, _escrow);
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

    /**
     * @dev Internal function to handle the transfer of different types of assets (ERC20, ERC721, ERC1155).
     * @param asset The asset to be transferred.
     * @param from The address sending the asset.
     * @param to The address receiving the asset.
     * @param amount The amount of the asset to transfer.
     */
    function _assetTransfer(Asset memory asset, address from, address to, uint256 amount) private {
        if (asset.assetType == AssetType.ERC20) {
            IERC20(asset.assetAddress).safeTransferFrom(from, to, amount);
        } else if (asset.assetType == AssetType.ERC721) {
            IERC721(asset.assetAddress).safeTransferFrom(from, to, asset.tokenId);
        } else if (asset.assetType == AssetType.ERC1155) {
            IERC1155(asset.assetAddress).safeTransferFrom(from, to, asset.tokenId, asset.amount, "");
        } else {
            revert UnsupportedAssetType(asset.assetType);
        }
    }

    function _transferAssets(
        DotcOffer memory offer,
        address from,
        uint256 amountToSend,
        address feeReceiver,
        uint256 feeAmount
    ) private {
        uint256 fees = (amountToSend * feeAmount) / OfferHelper.DECIMALS;
        uint256 amountToPay = amountToSend - feeAmount;

        uint256 unstandartizedAmount = offer.withdrawalAsset.unstandardize(amountToPay);

        if (unstandartizedAmount == 0) {
            revert AmountWithoutFeesIsZeroError();
        }

        if (feeReceiver != address(0) && feeAmount != 0) {
            _assetTransfer(offer.withdrawalAsset, from, feeReceiver, fees);
        }

        _assetTransfer(offer.withdrawalAsset, from, offer.maker, unstandartizedAmount);
    }

    function _sendWithdrawalFees(uint256 assetAmount) private returns (uint256 fees) {
        uint256 feeAmount = escrow.feeManagement().amount;
        uint256 feeReceiver = escrow.feeManagement().receiver;

        fees = _calculateFees(assetAmount, feeAmount);

        if (feeReceiver != address(0) && feeAmount != 0) {
            _assetTransfer(offer.withdrawalAsset, from, feeReceiver, fees);
        }
    }

    function _calculateFees(uint256 amount, uint256 feeAmount) private returns (uin256 fees) {
        fees = (amount * feeAmount) / OfferHelper.DECIMALS;
    }
}
