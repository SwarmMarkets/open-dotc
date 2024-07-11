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

Indicates that pasted not correct percentage amount.

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
  PartialTaking,
  FullyTaking
}
```

## ValidityType

Defines the types of validity states an offer can have in the DOTC system.

_Enum representing different states of offer validity, like non-existent or fully taken.
- NotExist: Indicates the offer does not exist.
- Partial: Represents a Partial Taking offer type where `taker` can take not the full amount of assets.
- Fully: Represents a Fully Taking offer type where `taker` should take the full amount of assets._

```solidity
enum ValidityType {
  NotTaken,
  Cancelled,
  PartiallyTaken,
  FullyTaken
}
```

## EscrowType

Defines the types of escrow states an offer can have in the DOTC system.

_Enum representing different states of escrow, like offer deposited or fully withdrew.
- NoType: Represents a state with no specific escrow type.
- OfferDeposited: Indicates that the offer has been deposited.
- OfferFullyWithdrew: Indicates that the offer has been fully withdrawn.
- OfferPartiallyWithdrew: Indicates that the offer has been partially withdrawn.
- OfferCancelled: Indicates that the offer has been cancelled._

```solidity
enum EscrowType {
  NoType,
  OfferDeposited,
  OfferFullyWithdrew,
  OfferPartiallyWithdrew,
  OfferCancelled
}
```

## Price

Represents the price details in the DOTC trading system.

_Defines the structure for price details including price feed address, min, max, and percentage._

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct Price {
  address priceFeedAddress;
  uint256 min;
  uint256 max;
  uint256 percentage;
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
  struct Price price;
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
  enum OfferPricingType offerPricingType;
  address[] specialAddresses;
  address[] authorizationAddresses;
  uint256 unitPrice;
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
  enum ValidityType validityType;
  struct Asset depositAsset;
  struct Asset withdrawalAsset;
  struct OfferStruct offer;
}
```

## EscrowOffer

Represents the escrow details of an offer in the DOTC trading system.

_Defines the structure for escrow details including escrow type and deposit asset._

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct EscrowOffer {
  enum EscrowType escrowType;
  struct Asset depositAsset;
}
```

