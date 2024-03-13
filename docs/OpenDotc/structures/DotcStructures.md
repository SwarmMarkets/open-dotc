# Solidity API

## AssetType

```solidity
enum AssetType {
  NoType,
  ERC20,
  ERC721,
  ERC1155
}
```

## Asset

```solidity
struct Asset {
  enum AssetType assetType;
  address assetAddress;
  uint256 amount;
  uint256 tokenId;
}
```

## DotcOffer

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

