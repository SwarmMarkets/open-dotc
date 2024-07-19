// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.25;

import { Initializable, Receiver, SafeTransferLib, IERC721, IERC1155 } from "./exports/ExternalExports.sol";

import { DotcV2 } from "./DotcV2.sol";
import { DotcManagerV2 } from "./DotcManagerV2.sol";
import { Asset, AssetType, EscrowOfferStatusType, EscrowDeposit, OnlyManager, OnlyDotc, ZeroAddressPassed } from "./structures/DotcStructuresV2.sol";

/// @title Errors related to asset management in the Dotc Escrow contract.
/// @notice Provides error messages for various failure conditions related to asset handling.

/**
 * @notice Indicates no asset amount was specified where a non-zero value is required.
 */
error AssetAmountEqZero();

/**
 * @notice Indicates no amount was specified for cancelling where a non-zero value is required.
 */
error AmountToCancelEqZero();

/**
 * @notice Indicates no fee amount was specified where a non-zero value is required.
 */
error FeesAmountEqZero();

/**
 * @title Escrow Contract for Dotc (Decentralized Over-The-Counter) Trading (as part of the "SwarmX.eth Protocol")
 * @notice It allows for depositing, withdrawing, and managing of assets in the course of trading.
 * @dev This contract handles the escrow of assets for DOTC trades, supporting ERC20, ERC721, and ERC1155 assets.
 * @author Swarm
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
 */
contract DotcEscrowV2 is Initializable, Receiver {
    /// @dev Used for Safe transfer tokens.
    using SafeTransferLib for address;

    /**
     * @dev Emitted when an offer's assets are deposited into escrow.
     * @param offerId Unique identifier of the offer.
     * @param maker Address of the user who made the offer.
     * @param amount Amount of the asset deposited.
     */
    event OfferDeposited(uint256 indexed offerId, address indexed maker, uint256 amount);

    /**
     * @dev Emitted when assets are withdrawn from escrow for an offer.
     * @param offerId Unique identifier of the offer.
     * @param taker Address of the user who is taking the offer.
     * @param amount Amount of the asset withdrawn.
     */
    event OfferWithdrawn(uint256 indexed offerId, address indexed taker, uint256 amount);

    /**
     * @dev Emitted when an offer is cancelled and its assets are returned.
     * @param offerId Unique identifier of the cancelled offer.
     * @param maker Address of the user who made the offer.
     * @param amountToWithdraw Amount of the asset returned to the maker.
     */
    event OfferCancelled(uint256 indexed offerId, address indexed maker, uint256 amountToWithdraw);

    /**
     * @dev Emitted when fees are withdrawn from the escrow.
     * @param offerId Unique identifier of the relevant offer.
     * @param to Address to which the fees are sent.
     * @param amountToWithdraw Amount of fees withdrawn.
     */
    event FeesWithdrew(uint256 indexed offerId, address indexed to, uint256 amountToWithdraw);

    /**
     * @dev Address of the manager contract.
     */
    DotcManagerV2 public manager;

    /**
     * @dev Address of the dotc contract.
     */
    DotcV2 public dotc;

    /**
     * @dev Mapping from offer IDs to their corresponding deposited assets.
     */
    mapping(uint256 => EscrowDeposit) public escrowDeposits;

    /**
     * @notice Ensures that the function is only callable by the DOTC contract.
     * @dev Modifier that restricts function access to the address of the DOTC contract.
     */
    modifier onlyDotc() {
        if (msg.sender != address(dotc)) {
            revert OnlyDotc();
        }
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the escrow contract with a fees parameters.
     * @dev Sets up the contract to handle ERC1155 and ERC721 tokens.
     * @param _manager The address of the manager contract.
     */
    function initialize(DotcManagerV2 _manager) public initializer {
        manager = _manager;
    }

    /**
     * @notice Sets the initial deposit for a maker's offer.
     * @param offerId The ID of the offer being deposited.
     * @param maker The address of the maker making the deposit.
     * @param asset The asset being deposited.
     * @dev Only callable by DOTC contract, ensures the asset is correctly deposited.
     */
    function setDeposit(uint256 offerId, address maker, Asset calldata asset) external onlyDotc {
        escrowDeposits[offerId].escrowOfferStatusType = EscrowOfferStatusType.OfferDeposited;
        escrowDeposits[offerId].depositAsset = asset;

        emit OfferDeposited(offerId, maker, asset.amount);
    }

    /**
     * @notice Withdraws a deposit from escrow to the taker's address.
     * @param offerId The ID of the offer being withdrawn.
     * @param amountToWithdraw Amount of the asset to withdraw.
     * @param taker The address receiving the withdrawn assets.
     * @dev Ensures that the withdrawal is valid and transfers the asset to the taker.
     */
    function withdrawDeposit(uint256 offerId, uint256 amountToWithdraw, address taker) external onlyDotc {
        EscrowDeposit memory offer = escrowDeposits[offerId];

        if (offer.depositAsset.amount <= 0) {
            revert AssetAmountEqZero();
        }

        escrowDeposits[offerId].depositAsset.amount -= amountToWithdraw;

        if (escrowDeposits[offerId].depositAsset.amount == 0) {
            escrowDeposits[offerId].escrowOfferStatusType = EscrowOfferStatusType.OfferFullyWithdrawn;
        } else {
            escrowDeposits[offerId].escrowOfferStatusType = EscrowOfferStatusType.OfferPartiallyWithdrawn;
        }

        _assetTransfer(offer.depositAsset, address(this), taker, amountToWithdraw);

        emit OfferWithdrawn(offerId, taker, amountToWithdraw);
    }

    /**
     * @notice Cancels a deposit in escrow, returning it to the maker.
     * @param offerId The ID of the offer being cancelled.
     * @param maker The address of the maker to return the assets to.
     * @return amountToCancel Amount of the asset returned to the maker.
     * @dev Only callable by DOTC contract, ensures the asset is returned to the maker.
     */
    function cancelDeposit(uint256 offerId, address maker) external onlyDotc returns (uint256 amountToCancel) {
        EscrowDeposit memory offer = escrowDeposits[offerId];

        if (offer.depositAsset.amount <= 0) {
            revert AmountToCancelEqZero();
        }

        amountToCancel = offer.depositAsset.amount;

        escrowDeposits[offerId].escrowOfferStatusType = EscrowOfferStatusType.OfferCancelled;
        escrowDeposits[offerId].depositAsset.amount = 0;

        _assetTransfer(offer.depositAsset, address(this), maker, offer.depositAsset.amount);

        emit OfferCancelled(offerId, maker, offer.depositAsset.amount);
    }

    /**
     * @notice Withdraws fee amount from escrow.
     * @param offerId The ID of the offer related to the fees.
     * @param feesAmountToWithdraw The amount of fees to withdraw.
     * @param to Address to which the fees are sent.
     * @dev Ensures that the fee withdrawal is valid and transfers the fee to the designated receiver.
     */
    function withdrawFees(uint256 offerId, uint256 feesAmountToWithdraw, address to) public onlyDotc {
        EscrowDeposit memory offer = escrowDeposits[offerId];

        escrowDeposits[offerId].depositAsset.amount -= feesAmountToWithdraw;

        _assetTransfer(offer.depositAsset, address(this), to, feesAmountToWithdraw);

        emit FeesWithdrew(offerId, to, feesAmountToWithdraw);
    }

    /**
     * @notice Withdraws fee amount from escrow to the default fee receiver.
     * @param offerId The ID of the offer related to the fees.
     * @param feesAmountToWithdraw The amount of fees to withdraw.
     */
    function withdrawFees(uint256 offerId, uint256 feesAmountToWithdraw) public {
        withdrawFees(offerId, feesAmountToWithdraw, manager.feeReceiver());
    }

    /**
     * @notice Changes the DOTC contract address in the escrow contract.
     * @param _dotc The new DOTC contract's address.
     * @dev Ensures that only the manager can perform this operation.
     */
    function changeDotc(DotcV2 _dotc) external {
        if (msg.sender != address(manager)) {
            revert OnlyManager();
        }

        dotc = _dotc;
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
            asset.assetAddress.safeTransfer(to, amount);
        } else if (asset.assetType == AssetType.ERC721) {
            IERC721(asset.assetAddress).safeTransferFrom(from, to, asset.tokenId);
        } else if (asset.assetType == AssetType.ERC1155) {
            IERC1155(asset.assetAddress).safeTransferFrom(from, to, asset.tokenId, asset.amount, "");
        }
    }
}
