// solhint-disable
//SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.25;

/// @notice Indicates the asset type provided is not supported by this contract
/// @param unsupportedType The unsupported asset type provided
error UnsupportedAssetType(AssetType unsupportedType);

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
 * @title Asset Types Enum
 * @notice Defines the different types of assets that can be used in the system.
 * @dev Enum representing various asset types supported in DOTC trades.
 * @author Swarm
 * - NoType: Represents a state with no specific asset type.
 * - ERC20: Represents an ERC20 token asset.
 * - ERC721: Represents an ERC721 token (NFT) asset.
 * - ERC1155: Represents an ERC1155 token (multi-token standard) asset.
 */
enum AssetType {
    NoType,
    ERC20,
    ERC721,
    ERC1155
}

/**
 * @title Offer Pricing Types Enum
 * @notice Defines the different types of pricing offers that can be used in the system.
 * @dev Enum representing various pricing offer types supported in DOTC trades.
 * @author Swarm
 * - NoType: Represents a state with no specific offer type.
 * - FixedPricing: Represents a Fixed Pricing offer type where `maker` specifies a fixed price.
 * - DynamicPricing: Represents a Dynamic Pricing offer type where `maker` specifies price feeds for assets.
 */
enum OfferPricingType {
    NoType,
    FixedPricing,
    DynamicPricing
}

/**
 * @title Offer Types Enum
 * @notice Defines the different types of taking offers that can be used in the system.
 * @dev Enum representing various taking offer types supported in DOTC trades.
 * @author Swarm
 * - NoType: Represents a state with no specific taking offer type.
 * - PartialTaking: Represents a Partial Taking offer type where `taker` can take not the full amount of assets.
 * - FullyTaking: Represents a Fully Taking offer type where `taker` should take the full amount of assets.
 */
enum TakingOfferType {
    NoType,
    PartialTaking,
    FullyTaking
}

/**
 * @title Validity Type Enum
 * @notice Defines the types of validity states an offer can have in the DOTC system.
 * @dev Enum representing different states of offer validity, like non-existent or fully taken.
 * - NotExist: Indicates the offer does not exist.
 * - Partial: Represents a Partial Taking offer type where `taker` can take not the full amount of assets.
 * - Fully: Represents a Fully Taking offer type where `taker` should take the full amount of assets.
 * @author Swarm
 */
enum ValidityType {
    NotTaken,
    Cancelled,
    PartiallyTaken,
    FullyTaken
}

enum EscrowType {
    NoType,
    OfferDeposited,
    OfferFullyWithdrew,
    OfferPartiallyWithdrew,
    OfferCancelled
}

struct Price {
    uint256 unitPrice;
    uint256 min;
    uint256 max;
    uint256 percentage;
}

/**
 * @title Asset Structure
 * @notice Represents an asset in the DOTC trading system.
 * @dev Defines the structure for an asset including type, address, amount, and token ID for NFTs.
 * @param assetType The type of the asset (ERC20, ERC721, ERC1155).
 * @param assetAddress The contract address of the asset.
 * @param assetPriceFeedAddress The contract address of the price feed for this asset.
 * @param amount The amount of the asset (relevant for ERC20 and ERC1155).
 * @param tokenId The token ID (relevant for ERC721 and ERC1155).
 * @author Swarm
 */
struct Asset {
    AssetType assetType;
    address assetAddress;
    address assetPriceFeedAddress;
    uint256 amount;
    uint256 tokenId;
}

/**
 * @title Offer Struct for DOTC
 * @notice Describes the structure of an offer within the DOTC trading system.
 * @dev Structure encapsulating details of an offer, including its type, special conditions, and timing constraints.
 * @param offerPricingType The type of the offer taking (Partial, Fully).
 * @param offerPricingType The type of the offer pricing (FixedPricing, DynamicPricing).
 * @param specialAddresses Array of addresses with exclusive rights to take the offer.
 * @param authorizationAddresses TODO
 * @param expiryTimestamp Unix timestamp marking the offer's expiration.
 * @param timelockPeriod Duration in seconds for which the offer is locked from being taken.
 * @param terms String URL pointing to the terms associated with the offer.
 * @param commsLink String URL providing a communication link (e.g., Telegram, email) for discussing the offer.
 * @author Swarm
 */
struct OfferStruct {
    TakingOfferType takingOfferType;
    OfferPricingType offerPricingType;
    Price price;
    address[] specialAddresses;
    address[] authorizationAddresses;
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
 * @param validityType The type of the dotc offer validation (NotExist, PartiallyTaken, FullyTaken).
 * @param depositAsset Asset offered by the maker.
 * @param withdrawalAsset Asset requested by the maker in exchange.
 * @param availableAmount Quantity of the deposit asset available for trade.
 * @param unitPrice Price per unit of the deposit asset in terms of the withdrawal asset.
 * @param offer Detailed structure of the offer including special conditions and timing.
 * @author Swarm
 */
struct DotcOffer {
    address maker;
    ValidityType validityType;
    Asset depositAsset;
    Asset withdrawalAsset;
    OfferStruct offer;
}

struct EscrowOffer {
    EscrowType escrowType;
    Asset depositAsset;
}
