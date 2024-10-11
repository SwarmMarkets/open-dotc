# Solidity API

## OnlyManager

```solidity
error OnlyManager()
```

Indicates that the operation was attempted by a non owner address.

## OnlyDotc

```solidity
error OnlyDotc()
```

Indicates that the operation was attempted by an unauthorized entity, not the Dotc contract.

## ZeroAddressPassed

```solidity
error ZeroAddressPassed()
```

Indicates usage of a zero address where an actual address is required.

## IncorrectPercentage

```solidity
error IncorrectPercentage(uint256 incorrectRevShare)
```

Indicates that an incorrect percentage amount was passed.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| incorrectRevShare | uint256 | The incorrect percentage amount that was passed. |

## AssetType

Defines the different types of assets that can be used in the system.

_Enum representing various asset types supported in DOTC trades._

```solidity
enum AssetType {
  NoType,
  ERC20,
  ERC721,
  ERC1155
}
```

## OfferPricingType

Defines the different types of pricing offers that can be used in the system.

_Enum representing various pricing offer types supported in DOTC trades._

```solidity
enum OfferPricingType {
  NoType,
  FixedPricing,
  DynamicPricing
}
```

## TakingOfferType

Defines the different types of taking offers that can be used in the system.

_Enum representing various taking offer types supported in DOTC trades._

```solidity
enum TakingOfferType {
  NoType,
  PartialOffer,
  BlockOffer
}
```

## PercentageType

Defines the different types of percentage calculation that can be used in the system.

_Enum representing various percentage types supported in DOTC trades._

```solidity
enum PercentageType {
  NoType,
  Plus,
  Minus
}
```

## OfferFillType

Defines the types of validity states an offer can have in the DOTC system.

_Enum representing different states of offer validity, like non-existent or fully taken.
- NotTaken: The offer has not been taken.
- Cancelled: The offer has been cancelled.
- PartiallyTaken: The offer has been partially taken.
- FullyTaken: The offer has been fully taken._

```solidity
enum OfferFillType {
  NotTaken,
  Cancelled,
  PartiallyTaken,
  FullyTaken
}
```

## EscrowOfferStatusType

Defines the types of escrow states an offer can have in the DOTC system.

_Enum representing different states of escrow, like offer deposited or fully withdrew._

```solidity
enum EscrowOfferStatusType {
  NoType,
  OfferDeposited,
  OfferFullyWithdrawn,
  OfferPartiallyWithdrawn,
  OfferCancelled
}
```

## AssetPrice

Represents the price details in the DOTC trading system.

_Defines the structure for price details including price feed address, offerMaximumPrice, offerMinimumPrice, and percentage._

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct AssetPrice {
  address priceFeedAddress;
  uint256 offerMaximumPrice;
  uint256 offerMinimumPrice;
}
```

## OfferPrice

Represents the pricing details of an offer in the DOTC trading system.

_Defines the structure for offer pricing details including pricing type, unit price, percentage, and percentage type._

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct OfferPrice {
  enum OfferPricingType offerPricingType;
  uint256 unitPrice;
  uint256 percentage;
  enum PercentageType percentageType;
}
```

## Asset

Represents an asset in the DOTC trading system.

_Defines the structure for an asset including type, address, amount, and token ID for NFTs._

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct Asset {
  enum AssetType assetType;
  address assetAddress;
  uint256 amount;
  uint256 tokenId;
  struct AssetPrice assetPrice;
}
```

## OfferStruct

Describes the structure of an offer within the DOTC trading system.

_Structure encapsulating details of an offer, including its type, special conditions, and timing constraints._

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct OfferStruct {
  enum TakingOfferType takingOfferType;
  struct OfferPrice offerPrice;
  address[] specialAddresses;
  address[] authorizationAddresses;
  uint256 expiryTimestamp;
  uint256 timelockPeriod;
  string terms;
  string commsLink;
}
```

## DotcOffer

Detailed structure of an offer in the DOTC trading system.

_Contains comprehensive information about an offer, including assets involved and trade conditions._

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct DotcOffer {
  address maker;
  enum OfferFillType offerFillType;
  struct Asset depositAsset;
  struct Asset withdrawalAsset;
  struct OfferStruct offer;
}
```

## EscrowDeposit

Represents the escrow details of an offer in the DOTC trading system.

_Defines the structure for escrow details including escrow type and deposit asset._

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct EscrowDeposit {
  enum EscrowOfferStatusType escrowOfferStatusType;
  struct Asset depositAsset;
}
```

