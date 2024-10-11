//SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.25;
import { OwnableUpgradeable, IERC20Metadata, IERC20, IERC721, IERC1155, IERC165 } from "./exports/Exports.sol";

import { Asset, AssetType, UnsupportedAssetType } from "./structures/DotcStructures.sol";
import { IDotcManager } from "./interfaces/IDotcManager.sol";
import { IDotcEscrow } from "./interfaces/IDotcEscrow.sol";
import { IDotc } from "./interfaces/IDotc.sol";

/// @title Errors related to asset transfers and validations in DotcManager
/// @notice Provides error messages for asset-related operations

/// @notice Indicates an operation with zero amount which is not allowed
error ZeroAmountPassed();

/// @notice Indicates usage of a zero address where an actual address is required
error ZeroAddressPassed();

/// @notice Indicates the account does not have enough ERC20 tokens required
/// @param account The account in question
/// @param erc20Token The ERC20 token address
/// @param currentAmount The current amount the account holds
/// @param requiredAmount The required amount that was not met
error AddressHaveNoERC20(address account, address erc20Token, uint256 currentAmount, uint256 requiredAmount);

/// @notice Indicates the account does not own the specified ERC721 token
/// @param account The account in question
/// @param erc721Token The ERC721 token address
/// @param tokenId The token ID that the account does not own
error AddressHaveNoERC721(address account, address erc721Token, uint256 tokenId);

/// @notice Indicates the account does not have enough of the specified ERC1155 token
/// @param account The account in question
/// @param erc1155Token The ERC1155 token address
/// @param tokenId The token ID in question
/// @param currentAmount The current amount the account holds
/// @param requiredAmount The required amount that was not met
error AddressHaveNoERC1155(
    address account,
    address erc1155Token,
    uint256 tokenId,
    uint256 currentAmount,
    uint256 requiredAmount
);

/// @notice Indicates that the token address does not match the expected asset type
/// @param token The token address
/// @param incorrectType The incorrect asset type provided
error IncorrectAssetTypeForAddress(address token, AssetType incorrectType);

/// @notice Indicates when an unauthorized attempt is made to change the escrow manager
error ChangeEscrowManagerError();

/// @notice Indicates when an unauthorized attempt is made to change the DOTC manager
error ChangeDotcManagerError();

/**
 * @title DotcManager contract for Dotc management (as part of the "SwarmX.eth Protocol")
 * @notice This contract serves as the central point for managing various aspects of the DOTC system
 * such as fees, escrow addresses, and asset standardization.
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
 * @dev Manages configurations and settings for the DOTC trading platform, including fee settings and escrow management.
 * @author Swarm
 */
contract DotcManager is OwnableUpgradeable, IDotcManager {
    /**
     * @dev Emitted when the escrow address is updated.
     * @param by Address of the user who performed the update.
     * @param escrow New escrow address.
     */
    event EscrowAddressSet(address indexed by, IDotcEscrow escrow);
    /**
     * @dev Emitted when the DOTC contract address is updated.
     * @param by Address of the user who performed the update.
     * @param Dotc New DOTC contract address.
     */
    event DotcSet(address indexed by, IDotc Dotc);
    /**
     * @dev Emitted when the fee receiver address is updated.
     * @param by Address of the user who performed the update.
     * @param newFeeReceiver New fee receiver address.
     */
    event FeeReceiverSet(address indexed by, address newFeeReceiver);
    /**
     * @dev Emitted when the fee amount is updated.
     * @param by Address of the user who performed the update.
     * @param feeAmount New fee amount.
     */
    event FeeAmountSet(address indexed by, uint256 feeAmount);
    /**
     * @dev Emitted when the manager address is updated.
     * @param by Address of the user who performed the update.
     * @param manager New manager address.
     */
    event ManagerAddressSet(address indexed by, IDotcManager manager);

    /**
     * @dev Base points used to standardize decimals.
     */
    uint256 public constant BPS = 10 ** 27;
    /**
     * @dev Standard decimal places used in Swarm.
     */
    uint256 public constant DECIMALS = 18;
    /**
     * @dev Address of the DOTC contract.
     */
    IDotc public dotc;
    /**
     * @dev Address of the escrow contract.
     */
    IDotcEscrow public escrow;
    /**
     * @dev Address where trading fees are sent.
     */
    address public feeReceiver;
    /**
     * @dev Amount of fees charged for trading.
     */
    uint256 public feeAmount;

    /**
     * @notice Ensures that the given address is not the zero address.
     * @param _address The address to check.
     */
    modifier zeroAddressCheck(address _address) {
        if (_address == address(0)) {
            revert ZeroAddressPassed();
        }
        _;
    }
    /**
     * @notice Ensures that the given amount is greater than zero.
     * @param amount The amount to check.
     */
    modifier zeroAmountCheck(uint256 amount) {
        if (amount <= 0) {
            revert ZeroAmountPassed();
        }
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the DotcManager contract.
     * @param _newFeeReceiver The initial address for receiving fees.
     * @dev Sets up the contract with default values and fee receiver.
     */
    function initialize(address _newFeeReceiver) public initializer {
        __Ownable_init(msg.sender);
        feeReceiver = _newFeeReceiver;
        feeAmount = 25 * (10 ** 23);
    }

    /**
     * @notice Updates the address of the escrow contract.
     * @param _escrow The new escrow contract address.
     * @return status True if the operation was successful.
     * @dev Requires caller to be the owner of the contract.
     */
    function changeEscrowAddress(
        IDotcEscrow _escrow
    ) external onlyOwner zeroAddressCheck(address(_escrow)) returns (bool status) {
        escrow = _escrow;

        emit EscrowAddressSet(msg.sender, _escrow);

        return true;
    }

    /**
     * @notice Updates the address of the DOTC contract.
     * @param _dotc The new DOTC contract address.
     * @return status True if the operation was successful.
     * @dev Requires caller to be the owner of the contract.
     */
    function changeDotcAddress(IDotc _dotc) external onlyOwner zeroAddressCheck(address(_dotc)) returns (bool status) {
        dotc = _dotc;

        emit DotcSet(msg.sender, _dotc);

        return true;
    }

    /**
     * @notice Updates the address for receiving trading fees.
     * @param _newFeeReceiver The new fee receiver address.
     * @return status True if the operation was successful.
     * @dev Requires caller to be the owner of the contract.
     */

    function changeFeeReceiver(
        address _newFeeReceiver
    ) external onlyOwner zeroAddressCheck(_newFeeReceiver) returns (bool status) {
        feeReceiver = _newFeeReceiver;

        emit FeeReceiverSet(msg.sender, _newFeeReceiver);

        return true;
    }

    /**
     * @notice Updates the trading fee amount.
     * @param _feeAmount The new fee amount.
     * @return status True if the operation was successful.
     * @dev Requires caller to be the owner of the contract.
     */
    function changeFeeAmount(uint256 _feeAmount) external onlyOwner zeroAmountCheck(_feeAmount) returns (bool status) {
        feeAmount = _feeAmount;

        emit FeeAmountSet(msg.sender, _feeAmount);

        return true;
    }

    /**
     * @notice Updates the manager address in the DOTC and escrow contracts.
     * @param _manager The new manager address.
     * @return status True if the operation was successful.
     * @dev Requires caller to be the owner and ensures the new manager address is valid.
     */
    function changeManagerInContracts(
        IDotcManager _manager
    ) external onlyOwner zeroAddressCheck(address(_manager)) returns (bool status) {
        if (!dotc.changeManager(_manager)) {
            revert ChangeDotcManagerError();
        }
        if (!escrow.changeManager(_manager)) {
            revert ChangeEscrowManagerError();
        }

        emit ManagerAddressSet(msg.sender, _manager);

        return true;
    }

    /**
     * @notice Checks if the specified account is the owner of the specified asset.
     * @param asset The asset to check.
     * @param account The account to verify ownership.
     * @return The type of the asset if the account owns it.
     */
    function checkAssetOwner(
        Asset calldata asset,
        address account,
        uint256 amount
    ) external view zeroAddressCheck(account) returns (AssetType) {
        return _checkAssetOwner(asset, account, amount);
    }

    /**
     * @notice Standardizes the amount of an asset based on its type.
     * @param asset The asset to standardize.
     * @return amount The standardized amount of the asset.
     */
    function standardizeAsset(Asset calldata asset) external view returns (uint amount) {
        amount = (asset.assetType == AssetType.ERC20)
            ? standardizeNumber(asset.amount, asset.assetAddress)
            : _standardize(asset.amount, 1);
    }

    /**
     * @notice Standardizes the amount of an asset based on its type with checking the ownership of this asset.
     * @param asset The asset to standardize.
     * @param assetOwner The address to check.
     * @return amount The standardized amount of the asset.
     */
    function standardizeAsset(
        Asset calldata asset,
        address assetOwner
    ) external view zeroAddressCheck(assetOwner) returns (uint amount) {
        amount = (_checkAssetOwner(asset, assetOwner, asset.amount) == AssetType.ERC20)
            ? standardizeNumber(asset.amount, asset.assetAddress)
            : _standardize(asset.amount, 1);
    }

    /**
     * @notice Converts the standardized amount of an asset back to its original form.
     * @param asset The asset to unstandardize.
     * @return amount The unstandardized amount of the asset.
     */
    function unstandardizeAsset(Asset calldata asset) public view returns (uint amount) {
        amount = (asset.assetType == AssetType.ERC20)
            ? unstandardizeNumber(asset.amount, asset.assetAddress)
            : _unstandardize(asset.amount, 1);
    }

    /**
     * @notice Standardizes a numerical amount based on token decimals.
     * @param amount The amount to standardize.
     * @param token The address of the token.
     * @return The standardized numerical amount.
     */
    function standardizeNumber(
        uint256 amount,
        address token
    ) public view zeroAddressCheck(token) zeroAmountCheck(amount) returns (uint256) {
        uint8 decimals = IERC20Metadata(token).decimals();
        return _standardize(amount, decimals);
    }

    /**
     * @notice Standardizes a numerical amount based on token decimals.
     * @param amount The amount to standardize.
     * @param decimals The decimals of the token.
     * @return The standardized numerical amount.
     */
    function standardizeNumber(
        uint256 amount,
        uint8 decimals
    ) external pure zeroAmountCheck(amount) zeroAmountCheck(decimals) returns (uint256) {
        return _standardize(amount, decimals);
    }

    /**
     * @notice Converts a standardized numerical amount back to its original form based on token decimals.
     * @param amount The amount to unstandardize.
     * @param token The address of the token.
     * @return The unstandardized numerical amount.
     */
    function unstandardizeNumber(
        uint256 amount,
        address token
    ) public view zeroAddressCheck(token) zeroAmountCheck(amount) returns (uint256) {
        uint8 decimals = IERC20Metadata(token).decimals();
        return _unstandardize(amount, decimals);
    }

    /**
     * @notice Converts a standardized numerical amount back to its original form based on token decimals.
     * @param amount The amount to unstandardize.
     * @param decimals The decimals of the token.
     * @return The unstandardized numerical amount.
     */
    function unstandardizeNumber(
        uint256 amount,
        uint8 decimals
    ) external pure zeroAmountCheck(amount) zeroAmountCheck(decimals) returns (uint256) {
        return _unstandardize(amount, decimals);
    }

    /**
     * @dev Internal function to standardize an amount based on decimals.
     * @param amount The amount to be standardized.
     * @param decimals The number of decimals to use for standardization.
     * @return The standardized amount.
     */
    function _standardize(uint256 amount, uint8 decimals) private pure returns (uint256) {
        return (amount * BPS) / 10 ** decimals;
    }

    /**
     * @dev Internal function to unstandardize an amount based on decimals.
     * @param amount The amount to be unstandardized.
     * @param decimals The number of decimals to use for unstandardization.
     * @return The unstandardized amount.
     */
    function _unstandardize(uint256 amount, uint8 decimals) private pure returns (uint256) {
        return (amount * 10 ** decimals) / BPS;
    }

    /**
     * @dev Internal function to check if an account owns an asset.
     * @param asset The asset to check.
     * @param account The account to verify ownership.
     * @param amount The amount of the asset.
     * @return assetType The type of the asset if the account owns it.
     */
    function _checkAssetOwner(
        Asset memory asset,
        address account,
        uint256 amount
    ) private view returns (AssetType assetType) {
        assetType = asset.assetType;

        if (assetType == AssetType.ERC20) {
            uint256 balance = IERC20(asset.assetAddress).balanceOf(account);
            if (balance < amount) {
                revert AddressHaveNoERC20(account, asset.assetAddress, balance, amount);
            }
        } else if (assetType == AssetType.ERC721) {
            if (!IERC165(asset.assetAddress).supportsInterface(type(IERC721).interfaceId)) {
                revert IncorrectAssetTypeForAddress(asset.assetAddress, assetType);
            }
            if (IERC721(asset.assetAddress).ownerOf(asset.tokenId) != account) {
                revert AddressHaveNoERC721(account, asset.assetAddress, asset.tokenId);
            }
        } else if (assetType == AssetType.ERC1155) {
            uint256 balance = IERC1155(asset.assetAddress).balanceOf(account, asset.tokenId);

            if (!IERC165(asset.assetAddress).supportsInterface(type(IERC1155).interfaceId)) {
                revert IncorrectAssetTypeForAddress(asset.assetAddress, assetType);
            }
            if (balance < asset.amount) {
                revert AddressHaveNoERC1155(account, asset.assetAddress, asset.tokenId, balance, asset.amount);
            }
        } else {
            revert UnsupportedAssetType(assetType);
        }
    }
}
