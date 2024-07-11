# Solidity API

## ZeroAmountPassed

```solidity
error ZeroAmountPassed()
```

Indicates an operation with zero amount which is not allowed.

## AssetTypeUndefinedError

```solidity
error AssetTypeUndefinedError()
```

Thrown when an asset type is not defined.

## AssetAddressIsZeroError

```solidity
error AssetAddressIsZeroError()
```

Thrown when the asset address is set to the zero address.

## AssetAmountIsZeroError

```solidity
error AssetAmountIsZeroError()
```

Thrown when the asset amount is set to zero, indicating no asset.

## ERC721AmountExceedsOneError

```solidity
error ERC721AmountExceedsOneError()
```

Thrown when the asset amount for an ERC721 asset exceeds one.

_ERC721 tokens should have an amount of exactly one._

## AddressHaveNoERC20

```solidity
error AddressHaveNoERC20(address account, address erc20Token, uint256 currentAmount, uint256 requiredAmount)
```

Indicates the account does not have enough ERC20 tokens required.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The account in question. |
| erc20Token | address | The ERC20 token address. |
| currentAmount | uint256 | The current amount the account holds. |
| requiredAmount | uint256 | The required amount that was not met. |

## AddressHaveNoERC721

```solidity
error AddressHaveNoERC721(address account, address erc721Token, uint256 tokenId)
```

Indicates the account does not own the specified ERC721 token.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The account in question. |
| erc721Token | address | The ERC721 token address. |
| tokenId | uint256 | The token ID that the account does not own. |

## AddressHaveNoERC1155

```solidity
error AddressHaveNoERC1155(address account, address erc1155Token, uint256 tokenId, uint256 currentAmount, uint256 requiredAmount)
```

Indicates the account does not have enough of the specified ERC1155 token.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The account in question. |
| erc1155Token | address | The ERC1155 token address. |
| tokenId | uint256 | The token ID in question. |
| currentAmount | uint256 | The current amount the account holds. |
| requiredAmount | uint256 | The required amount that was not met. |

## IncorrectAssetTypeForAddress

```solidity
error IncorrectAssetTypeForAddress(address token, enum AssetType incorrectType)
```

Indicates that the token address does not match the expected asset type.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The token address. |
| incorrectType | enum AssetType | The incorrect asset type provided. |

## UnsupportedAssetType

```solidity
error UnsupportedAssetType(enum AssetType unsupportedType)
```

Indicates the asset type provided is not supported by this contract.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| unsupportedType | enum AssetType | The unsupported asset type provided. |

## IncorrectPriceFeed

```solidity
error IncorrectPriceFeed(address assetPriceFeedAddress)
```

Indicates the price feed address is incorrect.

## PriceShouldNotBeSpecifiedFor

```solidity
error PriceShouldNotBeSpecifiedFor(enum OfferPricingType offerPricingType)
```

Indicates that the price should not be specified for the given offer pricing type.

## BothMinMaxCanNotBeSpecifiedFor

```solidity
error BothMinMaxCanNotBeSpecifiedFor(enum OfferPricingType offerPricingType)
```

Indicates that both min and max price should not be specified for the given offer pricing type.

## AssetHelper

This library provides functions to handle and validate asset operations within the SwarmX.eth Protocol.
////////////////DISCLAIMER////////////////DISCLAIMER////////////////DISCLAIMER////////////////
Please read the Disclaimer featured on the SwarmX.eth website ("Terms") carefully before accessing,
interacting with, or using the SwarmX.eth Protocol software, consisting of the SwarmX.eth Protocol
technology stack (in particular its smart contracts) as well as any other SwarmX.eth technology such
as e.g., the launch kit for frontend operators (together the "SwarmX.eth Protocol Software").
By using any part of the SwarmX.eth Protocol you agree (1) to the Terms and acknowledge that you are
aware of the existing risk and knowingly accept it, (2) that you have read, understood and accept the
legal information and terms of service and privacy note presented in the Terms, and (3) that you are
neither a US person nor a person subject to international sanctions (in particular as imposed by the
European Union, Switzerland, the United Nations, as well as the USA). If you do not meet these
requirements, please refrain from using the SwarmX.eth Protocol.
////////////////DISCLAIMER////////////////DISCLAIMER////////////////DISCLAIMER////////////////

_The library uses FixedPointMathLib and MetadataReaderLib for precise calculations and metadata reading._

### BPS

```solidity
uint256 BPS
```

Base points used to standardize decimals.

### SCALING_FACTOR

```solidity
uint256 SCALING_FACTOR
```

Scaling factor used in percentage calculations.

### DECIMALS_BY_DEFAULT

```solidity
uint8 DECIMALS_BY_DEFAULT
```

Default number of decimals used in standardization.

### zeroAmountCheck

```solidity
modifier zeroAmountCheck(uint256 amount)
```

Ensures that the given amount is greater than zero.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The amount to check. |

### checkAssetOwner

```solidity
function checkAssetOwner(struct Asset asset, address account, uint256 amount) external view
```

Checks if an account owns the specified asset in the required amount.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | struct Asset | The asset to check. |
| account | address | The account to verify ownership. |
| amount | uint256 | The amount of the asset. |

### checkAssetStructure

```solidity
function checkAssetStructure(struct Asset asset, enum OfferPricingType offerPricingType) external pure
```

Ensures that the asset structure is valid.

_Checks for asset type, asset address, and amount validity._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | struct Asset | The asset to be checked. |
| offerPricingType | enum OfferPricingType | The type of pricing for the offer. |

### calculateRate

```solidity
function calculateRate(struct Asset depositAsset, struct Asset withdrawalAsset) external view returns (uint256 depositToWithdrawalRate, uint256 withdrawalPrice)
```

Calculates the rate between two assets for deposit and withdrawal.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| depositAsset | struct Asset | The asset being deposited. |
| withdrawalAsset | struct Asset | The asset being withdrawn. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| depositToWithdrawalRate | uint256 | The rate from deposit to withdrawal asset. |
| withdrawalPrice | uint256 | The calculated withdrawal price. |

### calculateFees

```solidity
function calculateFees(uint256 amount, uint256 feeAmount, uint256 revSharePercentage) external pure returns (uint256 fees, uint256 feesToFeeReceiver, uint256 feesToAffiliate)
```

Calculates fees based on the given amount, fee amount, and revenue share percentage.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The total amount. |
| feeAmount | uint256 | The fee amount to be deducted. |
| revSharePercentage | uint256 | The revenue share percentage. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| fees | uint256 | The total calculated fees. |
| feesToFeeReceiver | uint256 | The fees allocated to the fee receiver. |
| feesToAffiliate | uint256 | The fees allocated to the affiliate. |

### standardize

```solidity
function standardize(struct Asset asset) public view returns (uint256)
```

Standardizes a numerical amount based on token decimals.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | struct Asset | The asset to standardize. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The standardized numerical amount. |

### unstandardize

```solidity
function unstandardize(struct Asset asset) public view returns (uint256)
```

Converts a standardized numerical amount back to its original form based on token decimals.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | struct Asset | The asset to standardize. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The unstandardized numerical amount. |

### standardize

```solidity
function standardize(struct Asset asset, uint256 amount) public view returns (uint256)
```

Standardizes a numerical amount based on token decimals.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | struct Asset | The asset to standardize. |
| amount | uint256 | The amount to standardize. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The standardized numerical amount. |

### unstandardize

```solidity
function unstandardize(struct Asset asset, uint256 amount) public view returns (uint256)
```

Converts a standardized numerical amount back to its original form based on token decimals.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | struct Asset | The asset to standardize. |
| amount | uint256 | The amount to unstandardize. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The unstandardized numerical amount. |

### calculatePercentage

```solidity
function calculatePercentage(uint256 value, uint256 percentage) public pure returns (uint256)
```

Calculates the percentage of a given value.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | The value to calculate the percentage of. |
| percentage | uint256 | The percentage to apply. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The calculated percentage. |

### calculatePartPercentage

```solidity
function calculatePartPercentage(uint256 part, uint256 whole) public pure returns (uint256)
```

Calculates the part percentage of a given whole.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| part | uint256 | The part value. |
| whole | uint256 | The whole value. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The calculated part percentage. |

