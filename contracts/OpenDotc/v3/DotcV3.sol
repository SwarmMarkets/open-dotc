//SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.25;

import { ReentrancyGuardUpgradeable, ERC1155HolderUpgradeable, ERC721HolderUpgradeable, IERC20, IERC721, IERC1155, SafeERC20 } from "./exports/Exports.sol";

import { IDotcManager } from "./interfaces/IDotcManager.sol";
import { Asset, AssetType, EscrowCallType, ValidityType, OfferStruct, DotcOffer, UnsupportedAssetType } from "./structures/DotcStructuresV2.sol";

/// @title Errors related to the Dotc contract
/// @notice Provides error messages for various failure conditions related to Offers and Assets handling

/// @notice Thrown when an asset type is not defined.
error AssetTypeUndefinedError();

/// @notice Thrown when the asset address is set to the zero address.
error AssetAddressIsZeroError();

/// @notice Thrown when the asset amount is set to zero, indicating no asset.
error AssetAmountIsZeroError();

/// @notice Thrown when the asset amount for an ERC721 asset exceeds one.
/// ERC721 tokens should have an amount of exactly one.
error ERC721AmountExceedsOneError();

/// @notice Thrown when an offer encounters a validity-related issue.
/// @param offerId The ID of the offer associated with the error.
/// @param _type The type of validity error encountered, represented as an enum of `ValidityType`.
error OfferValidityError(uint256 offerId, ValidityType _type);

/// @notice Thrown when an action is attempted on an offer that has already expired.
/// @param offerId The ID of the offer associated with the error.
error OfferExpiredError(uint256 offerId);

/// @notice Thrown when an action is attempted on an offer that is still within its timelock period.
/// @param offerId The ID of the offer associated with the error.
error OfferInTimelockError(uint256 offerId);

/// @notice Thrown when an action is attempted on an offer with an expired timestamp.
/// @param timestamp The expired timestamp for the offer.
error OfferExpiredTimestampError(uint256 timestamp);

/// @notice Thrown when the timelock period of an offer is set incorrectly.
/// @param timelock The incorrect timelock period for the offer.
error IncorrectTimelockPeriodError(uint256 timelock);

/// @notice Thrown when a partial offer type is attempted with ERC721 or ERC1155 assets, which is unsupported.
error UnsupportedPartialOfferForNonERC20AssetsError();

/// @notice Thrown when the call to escrow fails.
/// @param _type The type of escrow call that failed.
error EscrowCallFailedError(EscrowCallType _type);

/// @notice Thrown when the offer address is set to the zero address.
/// @param arrayIndex The index in the array where the zero address was encountered.
error OfferAddressIsZeroError(uint256 arrayIndex);

/// @notice Thrown when a non-special address attempts to take a special offer.
error NotSpecialAddressError();

/// @notice Thrown when the calculated fee amount is zero or less.
error FeeAmountIsZeroError();

/// @notice Thrown when the amount to pay, excluding fees, is zero or less.
error AmountWithoutFeesIsZeroError();

/// @notice Thrown when the amount to send does not match the required amount for a full offer.
/// @param providedAmount The incorrect amount provided for the full offer.
error IncorrectFullOfferAmountError(uint256 providedAmount);

/// @notice Thrown when withdrawal of deposit assets from the escrow fails.
error EscrowDepositWithdrawalFailedError();

/// @notice Thrown when a non-maker tries to perform an action on their own offer.
/// @param maker The address of the offer's maker.
error OnlyMakerAllowedError(address maker);

/// @notice Thrown when there's an attempt to change the amount of an ERC721 offer.
error ERC721OfferAmountChangeError();

/// @notice Thrown when a non-manager tries to call a manager-only function.
error ManagerOnlyFunctionError();

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
contract DotcV3 is ReentrancyGuardUpgradeable, ERC1155HolderUpgradeable, ERC721HolderUpgradeable {
    ///@dev Used for Safe transfer tokens
    using SafeERC20 for IERC20;

    /**
     * @notice Emitted when a new trading offer is created.
     * @param maker Address of the user creating the offer.
     * @param offerId Unique identifier of the created offer.
     * @param isFullType Indicates if the offer is of a full type.
     * @param depositAsset Asset to be deposited by the maker.
     * @param withdrawalAsset Asset to be withdrawn by the maker.
     * @param specialAddresses Special addresses involved in the trade, if any.
     * @param expiryTimestamp Expiry time of the offer.
     * @param timelockPeriod Timelock period for the offer.
     */
    event CreatedOffer(
        address indexed maker,
        uint256 indexed offerId,
        bool isFullType,
        Asset depositAsset,
        Asset withdrawalAsset,
        address[] specialAddresses,
        uint256 expiryTimestamp,
        uint256 timelockPeriod
    );
    /**
     * @notice Emitted when an offer is successfully taken.
     * @param offerId Unique identifier of the taken offer.
     * @param takenBy Address of the user taking the offer.
     * @param isFullyTaken Indicates if the offer is fully taken.
     * @param amountToReceive Amount received in the trade.
     * @param amountPaid Amount paid to take the offer.
     */
    event TakenOffer(
        uint256 indexed offerId,
        address indexed takenBy,
        bool indexed isFullyTaken,
        uint256 amountToReceive,
        uint256 amountPaid
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
     * @notice Emitted when the manager address is changed.
     * @param by Address of the user who changed the manager address.
     * @param manager New manager's address.
     */
    event ManagerAddressSet(address indexed by, IDotcManager manager);

    /**
     * @notice The instance of IDotcManager that manages this contract.
     * @dev Holds the address of the manager contract which provides key functionalities like escrow management.
     */
    IDotcManager public manager;
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
     * @notice Stores the timelock period for each offer.
     * @dev Maps an offer ID to its timelock period.
     */
    mapping(uint256 => uint256) public timelock;
    /**
     * @notice Tracks the ID to be assigned to the next created offer.
     * @dev Incremented with each new offer, ensuring unique IDs for all offers.
     */
    uint256 public currentOfferId;

    /**
     * @notice Ensures that the caller to the offer is maker of this offer.
     * @dev Checks if the offer exists and has not been fully taken.
     * @param offerId The ID of the offer to be checked.
     */
    modifier onlyMaker(uint256 offerId) {
        DotcOffer memory offer = allOffers[offerId];

        if (offer.maker != msg.sender) {
            revert OnlyMakerAllowedError(offer.maker);
        }

        _;
    }

    /**
     * @notice Ensures that the asset structure is valid.
     * @dev Checks for asset type, asset address, and amount validity.
     * @param asset The asset to be checked.
     */
    modifier checkAssetStructure(Asset calldata asset) {
        if (asset.assetType == AssetType.NoType) {
            revert AssetTypeUndefinedError();
        }
        if (asset.assetAddress == address(0)) {
            revert AssetAddressIsZeroError();
        }
        if (asset.amount == 0) {
            revert AssetAmountIsZeroError();
        }
        if (asset.assetType == AssetType.ERC721 && asset.amount > 1) {
            revert ERC721AmountExceedsOneError();
        }

        _;
    }

    /**
     * @notice Ensures that the offer structure is valid.
     * @dev Checks for asset type, asset address, and amount validity.
     * @param offer The offer to be checked.
     */
    modifier checkOfferStructure(OfferStruct calldata offer) {
        if (offer.expiryTimestamp <= block.timestamp) {
            revert OfferExpiredTimestampError(offer.expiryTimestamp);
        }
        if (
            offer.timelockPeriod > 0 &&
            (offer.timelockPeriod <= block.timestamp || offer.timelockPeriod >= offer.expiryTimestamp)
        ) {
            revert IncorrectTimelockPeriodError(offer.timelockPeriod);
        }

        for (uint256 i = 0; i < offer.specialAddresses.length; ) {
            if (offer.specialAddresses[i] == address(0)) {
                revert OfferAddressIsZeroError(i);
            }
            unchecked {
                ++i;
            }
        }

        _;
    }

    /**
     * @notice Ensures that the offer is valid and available.
     * @dev Checks if the offer exists and has not been fully taken.
     * @param offerId The ID of the offer to be checked.
     */
    modifier checkOffer(uint256 offerId) {
        DotcOffer memory offer = allOffers[offerId];

        if (offer.maker == address(0)) {
            revert OfferValidityError(offerId, ValidityType.NotExist);
        }
        if (offer.isFullyTaken) {
            revert OfferValidityError(offerId, ValidityType.FullyTaken);
        }

        _;
    }

    /**
     * @notice Checks if the offer has not expired.
     * @dev Ensures the current time is before the offer's expiry time.
     * @param offerId The ID of the offer to check for expiry.
     */
    modifier notExpired(uint256 offerId) {
        if (allOffers[offerId].offer.expiryTimestamp <= block.timestamp) {
            revert OfferExpiredError(offerId);
        }
        _;
    }

    /**
     * @notice Ensures that the timelock period of the offer has passed.
     * @dev Checks if the current time is beyond the offer's timelock period.
     * @param offerId The ID of the offer to check for timelock expiry.
     */
    modifier timelockPassed(uint256 offerId) {
        if (allOffers[offerId].offer.timelockPeriod >= block.timestamp) {
            revert OfferInTimelockError(offerId);
        }
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the contract with a given manager.
     * @dev Sets up the reentrancy guard and ERC token holder functionalities.
     * @param _manager The address of the manager to be set for this contract.
     */
    function initialize(IDotcManager _manager) public initializer {
        __ReentrancyGuard_init();
        __ERC1155Holder_init();
        __ERC721Holder_init();

        manager = _manager;
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
    )
        external
        checkAssetStructure(depositAsset)
        checkAssetStructure(withdrawalAsset)
        checkOfferStructure(offer)
        nonReentrant
    {
        if (
            !offer.isFullType &&
            (depositAsset.assetType != AssetType.ERC20 || withdrawalAsset.assetType != AssetType.ERC20)
        ) {
            revert UnsupportedPartialOfferForNonERC20AssetsError();
        }

        uint256 _currentOfferId = currentOfferId;

        DotcOffer memory _offer = _createOffer(depositAsset, withdrawalAsset, offer);

        currentOfferId++;
        offersFromAddress[msg.sender].push(_currentOfferId);
        allOffers[_currentOfferId] = _offer;

        // Sending DepositAsset from Maker to Escrow
        assetTransfer(depositAsset, msg.sender, address(manager.escrow()), depositAsset.amount);

        if (!manager.escrow().setDeposit(_currentOfferId, msg.sender, depositAsset)) {
            revert EscrowCallFailedError(EscrowCallType.Deposit);
        }

        emit CreatedOffer(
            msg.sender,
            _currentOfferId,
            offer.isFullType,
            depositAsset,
            withdrawalAsset,
            offer.specialAddresses,
            offer.expiryTimestamp,
            offer.timelockPeriod
        );
    }

    /**
     * @notice Allows a user to take an available offer.
     * @param offerId The ID of the offer to take.
     * @param amountToSend The amount of the withdrawal asset to send.
     * @dev Handles the transfer of assets between maker and taker.
     */
    function takeOffer(
        uint256 offerId,
        uint256 amountToSend
    ) public checkOffer(offerId) notExpired(offerId) nonReentrant {
        DotcOffer memory offer = allOffers[offerId];

        if (offer.offer.specialAddresses.length > 0) {
            bool isSpecialTaker = false;
            for (uint256 i = 0; i < offer.offer.specialAddresses.length; ) {
                if (offer.offer.specialAddresses[i] == msg.sender) {
                    isSpecialTaker = true;
                    break;
                }
                unchecked {
                    ++i;
                }
            }
            if (!isSpecialTaker) {
                revert NotSpecialAddressError();
            }
        }

        uint256 amountToWithdraw = offer.depositAsset.amount;
        uint256 realAmount = amountToWithdraw;

        uint256 feesAmount;
        bool isFullyTaken;

        if (manager.checkAssetOwner(offer.withdrawalAsset, msg.sender, amountToSend) == AssetType.ERC20) {
            uint256 standardizedAmount = manager.standardizeNumber(amountToSend, offer.withdrawalAsset.assetAddress);

            feesAmount = (amountToSend * manager.feeAmount()) / manager.BPS();
            uint256 amountToPay = amountToSend - feesAmount;

            if (feesAmount == 0) {
                revert FeeAmountIsZeroError();
            }
            if (amountToPay == 0) {
                revert AmountWithoutFeesIsZeroError();
            }

            if (offer.offer.isFullType) {
                if (standardizedAmount != offer.withdrawalAsset.amount) {
                    revert IncorrectFullOfferAmountError(standardizedAmount);
                }

                isFullyTaken = _fullyTakeOffer(allOffers[offerId]);
            } else {
                (amountToWithdraw, realAmount, isFullyTaken) = _partiallyTakeOffer(
                    allOffers[offerId],
                    standardizedAmount,
                    amountToWithdraw
                );
            }

            // Send fees from taker to `feeReceiver`
            assetTransfer(offer.withdrawalAsset, msg.sender, manager.feeReceiver(), feesAmount);

            // Sending Withdrawal Asset from Taker to Maker
            assetTransfer(offer.withdrawalAsset, msg.sender, offer.maker, amountToPay);
        } else {
            isFullyTaken = _fullyTakeOffer(allOffers[offerId]);

            if (offer.depositAsset.assetType == AssetType.ERC20) {
                feesAmount = (offer.depositAsset.amount * manager.feeAmount()) / manager.BPS();

                amountToWithdraw -= feesAmount;

                if (!manager.escrow().withdrawFees(offerId, feesAmount)) {
                    revert EscrowCallFailedError(EscrowCallType.WithdrawFees);
                }
            }

            // Sending Withdrawal Asset from Taker to Maker
            assetTransfer(offer.withdrawalAsset, msg.sender, offer.maker, offer.withdrawalAsset.amount);
        }

        // Sending Deposit Asset from Escrow to Taker
        if (!manager.escrow().withdrawDeposit(offerId, amountToWithdraw, msg.sender)) {
            revert EscrowCallFailedError(EscrowCallType.Withdraw);
        }

        emit TakenOffer(offerId, msg.sender, isFullyTaken, realAmount, amountToSend);
    }

    /**
     * @notice Cancels an offer and refunds the maker.
     * @param offerId The ID of the offer to cancel.
     * @dev Can only be called by the offer's maker and when the timelock has passed.
     */
    function cancelOffer(
        uint256 offerId
    ) external onlyMaker(offerId) checkOffer(offerId) timelockPassed(offerId) nonReentrant {
        delete allOffers[offerId];

        (bool success, uint256 amountToWithdraw) = manager.escrow().cancelDeposit(offerId, msg.sender);

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
    ) external onlyMaker(offerId) checkOffer(offerId) timelockPassed(offerId) returns (bool status) {
        DotcOffer memory offer = allOffers[offerId];

        if (newAmount > 0) {
            if (offer.withdrawalAsset.assetType == AssetType.ERC721) {
                revert ERC721OfferAmountChangeError();
            }
            uint256 standardizedNewAmount = offer.withdrawalAsset.assetType == AssetType.ERC20
                ? manager.standardizeNumber(newAmount, offer.withdrawalAsset.assetAddress)
                : newAmount;

            allOffers[offerId].withdrawalAsset.amount = standardizedNewAmount;
            allOffers[offerId].unitPrice = (standardizedNewAmount * 10 ** manager.DECIMALS()) / offer.availableAmount;

            emit OfferAmountUpdated(offerId, newAmount);
        }

        if (updatedOffer.specialAddresses.length > 0) {
            for (uint256 i = 0; i < updatedOffer.specialAddresses.length; ) {
                if (updatedOffer.specialAddresses[i] == address(0)) {
                    revert OfferAddressIsZeroError(i);
                }
                unchecked {
                    ++i;
                }
            }

            allOffers[offerId].offer.specialAddresses = updatedOffer.specialAddresses;
            emit OfferSpecialAddressesUpdated(offerId, updatedOffer.specialAddresses);
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

        if (updatedOffer.timelockPeriod > offer.offer.timelockPeriod) {
            if (allOffers[offerId].offer.expiryTimestamp <= updatedOffer.timelockPeriod) {
                revert IncorrectTimelockPeriodError(updatedOffer.timelockPeriod);
            }

            allOffers[offerId].offer.timelockPeriod = updatedOffer.timelockPeriod;
            emit UpdatedTimeLockPeriod(offerId, updatedOffer.timelockPeriod);
        }

        return true;
    }

    /**
     * @notice Changes the manager of the contract.
     * @param _manager The new manager address.
     * @return status Boolean indicating the success of the operation.
     * @dev Can only be called by the current manager.
     */
    function changeManager(IDotcManager _manager) external returns (bool status) {
        if (msg.sender != address(manager)) {
            revert ManagerOnlyFunctionError();
        }

        manager = _manager;

        emit ManagerAddressSet(msg.sender, _manager);

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

    // Internal function to create an offer.
    function _createOffer(
        Asset calldata depositAsset,
        Asset calldata withdrawalAsset,
        OfferStruct calldata offer
    ) private view returns (DotcOffer memory _offer) {
        uint256 standardizedDepositAmount = manager.standardizeAsset(depositAsset, msg.sender);
        uint256 standardizedWithdrawalAmount = manager.standardizeAsset(withdrawalAsset);

        _offer.maker = msg.sender;

        _offer.depositAsset = depositAsset;
        _offer.withdrawalAsset = withdrawalAsset;

        _offer.offer = offer;

        if (_offer.depositAsset.assetType == AssetType.ERC20) _offer.depositAsset.amount = standardizedDepositAmount;
        if (_offer.withdrawalAsset.assetType == AssetType.ERC20)
            _offer.withdrawalAsset.amount = standardizedWithdrawalAmount;

        _offer.availableAmount = _offer.depositAsset.amount;
        _offer.unitPrice = (_offer.withdrawalAsset.amount * 10 ** manager.DECIMALS()) / _offer.depositAsset.amount;
    }

    // Internal function to handle the full taking of an offer.
    function _fullyTakeOffer(DotcOffer storage offer) private returns (bool isFullyTaken) {
        isFullyTaken = true;

        offer.withdrawalAsset.amount = 0;
        offer.availableAmount = 0;
        offer.isFullyTaken = isFullyTaken;
    }

    // Internal function to handle the partial taking of an offer.
    function _partiallyTakeOffer(
        DotcOffer storage offer,
        uint256 standardizedAmount,
        uint256 amountToWithdraw
    ) private returns (uint256 amount, uint256 realAmount, bool isFullyTaken) {
        DotcOffer memory _offer = offer;

        if (standardizedAmount == _offer.withdrawalAsset.amount) {
            amountToWithdraw = _offer.availableAmount;
            offer.withdrawalAsset.amount = 0;
            offer.availableAmount = 0;
        } else {
            amountToWithdraw = (standardizedAmount * 10 ** manager.DECIMALS()) / _offer.unitPrice;

            offer.withdrawalAsset.amount -= standardizedAmount;
            offer.availableAmount -= amountToWithdraw;
        }

        if (offer.withdrawalAsset.amount == 0 || offer.availableAmount == 0) {
            isFullyTaken = true;
            offer.isFullyTaken = isFullyTaken;
        }

        amount = amountToWithdraw;
        realAmount = manager.unstandardizeNumber(amount, _offer.depositAsset.assetAddress);
    }

    /**
     * @dev Internal function to handle the transfer of different types of assets (ERC20, ERC721, ERC1155).
     * @param asset The asset to be transferred.
     * @param from The address sending the asset.
     * @param to The address receiving the asset.
     * @param amount The amount of the asset to transfer.
     */
    function assetTransfer(Asset memory asset, address from, address to, uint256 amount) private {
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
}
