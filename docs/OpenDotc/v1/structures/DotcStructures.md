# Solidity API

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
}
```

## DotcOffer

Represents an offer in the DOTC trading system.

_Structure containing details of an offer including maker, assets involved, and trading conditions._

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct DotcOffer {
  address maker;
  bool isFullType;
  bool isFullyTaken;
  struct Asset depositAsset;
  struct Asset withdrawalAsset;
  uint256 availableAmount;
  uint256 unitPrice;
  address specialAddress;
  uint256 expiryTime;
  uint256 timelockPeriod;
}
```

