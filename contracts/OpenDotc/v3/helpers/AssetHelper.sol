//SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.25;

import { SafeERC20, IERC20, IERC20Metadata, IERC721, IERC1155, IERC165 } from "../exports/Exports.sol";
import { Asset, AssetType, UnsupportedAssetType } from "../structures/DotcStructuresV3.sol";

/// @notice Indicates an operation with zero amount which is not allowed
error ZeroAmountPassed();

/// @notice Thrown when an asset type is not defined.
error AssetTypeUndefinedError();

/// @notice Thrown when the asset address is set to the zero address.
error AssetAddressIsZeroError();

/// @notice Thrown when the asset amount is set to zero, indicating no asset.
error AssetAmountIsZeroError();

/// @notice Thrown when the asset amount for an ERC721 asset exceeds one.
/// ERC721 tokens should have an amount of exactly one.
error ERC721AmountExceedsOneError();

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
library AssetHelper {
    ///@dev Used for Safe transfer tokens
    using SafeERC20 for IERC20;

    /**
     * @dev Base points used to standardize decimals.
     */
    uint256 public constant BPS = 10 ** 27;

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

    /**
     * @notice Ensures that the asset structure is valid.
     * @dev Checks for asset type, asset address, and amount validity.
     * @param asset The asset to be checked.
     */
    function checkAssetStructure(Asset calldata asset) external pure {
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
    }

    /**
     * @dev Internal function to handle the transfer of different types of assets (ERC20, ERC721, ERC1155).
     * @param asset The asset to be transferred.
     * @param from The address sending the asset.
     * @param to The address receiving the asset.
     * @param amount The amount of the asset to transfer.
     */
    function assetTransfer(Asset memory asset, address from, address to, uint256 amount) external {
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

    /**
     * @notice Checks if the specified account is the owner of the specified asset.
     * @param asset The asset to check.
     * @param account The account to verify ownership.
     * @return The type of the asset if the account owns it.
     */
    function checkAssetOwner(Asset calldata asset, address account, uint256 amount) external view returns (AssetType) {
        return _checkAssetOwner(asset, account, amount);
    }

    /**
     * @notice Standardizes the amount of an asset based on its type.
     * @param asset The asset to standardize.
     * @return amount The standardized amount of the asset.
     */
    function standardizeAsset(Asset calldata asset) external view returns (uint amount) {
        amount = (asset.assetType == AssetType.ERC20)
            ? standardizeNumber(asset, asset.amount)
            : _standardize(asset.amount, 1);
    }

    /**
     * @notice Standardizes the amount of an asset based on its type with checking the ownership of this asset.
     * @param asset The asset to standardize.
     * @param assetOwner The address to check.
     * @return amount The standardized amount of the asset.
     */
    function standardizeAsset(Asset calldata asset, address assetOwner) external view returns (uint amount) {
        amount = (_checkAssetOwner(asset, assetOwner, asset.amount) == AssetType.ERC20)
            ? standardizeNumber(asset, asset.amount)
            : _standardize(asset.amount, 1);
    }

    /**
     * @notice Converts the standardized amount of an asset back to its original form.
     * @param asset The asset to unstandardize.
     * @return amount The unstandardized amount of the asset.
     */
    function unstandardizeAsset(Asset calldata asset) public view returns (uint amount) {
        amount = (asset.assetType == AssetType.ERC20)
            ? unstandardizeNumber(asset, asset.amount)
            : _unstandardize(asset.amount, 1);
    }

    /**
     * @notice Standardizes a numerical amount based on token decimals.
     * @param asset The asset to standardize.
     * @param amount The amount to standardize.
     * @return The standardized numerical amount.
     */
    function standardizeNumber(
        Asset calldata asset,
        uint256 amount
    ) public view zeroAmountCheck(amount) returns (uint256) {
        uint8 decimals = IERC20Metadata(asset.assetAddress).decimals();
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
     * @param asset The asset to standardize.
     * @param amount The amount to unstandardize.
     * @return The unstandardized numerical amount.
     */
    function unstandardizeNumber(
        Asset calldata asset,
        uint256 amount
    ) public view zeroAmountCheck(amount) returns (uint256) {
        uint8 decimals = IERC20Metadata(asset.assetAddress).decimals();
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