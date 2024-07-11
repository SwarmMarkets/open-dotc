# Solidity API

## OfferExpiredTimestampError

```solidity
error OfferExpiredTimestampError(uint256 timestamp)
```

Thrown when an action is attempted on an offer with an expired timestamp.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| timestamp | uint256 | The expired timestamp for the offer. |

## NotSpecialAddressError

```solidity
error NotSpecialAddressError(address sender)
```

Thrown when a non-special address attempts to take a special offer.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| sender | address | The address that attempts to take a special offer. |

## NotAuthorizedAccountError

```solidity
error NotAuthorizedAccountError(address sender)
```

Thrown when a non-authorized address attempts to take a special offer.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| sender | address | The address that attempts to take a special offer. |

## AddressIsZeroError

```solidity
error AddressIsZeroError(uint256 arrayIndex)
```

Thrown when the authorization address is set to the zero address.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| arrayIndex | uint256 | The index in the array where the zero address was encountered. |

## UnsupportedPartialOfferForNonERC20AssetsError

```solidity
error UnsupportedPartialOfferForNonERC20AssetsError()
```

Thrown when a partial offer type is attempted with ERC721 or ERC1155 assets, which is unsupported.

## IncorrectTimelockPeriodError

```solidity
error IncorrectTimelockPeriodError(uint256 timelock)
```

Thrown when the timelock period of an offer is set incorrectly.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| timelock | uint256 | The incorrect timelock period for the offer. |

## OfferExpiredError

```solidity
error OfferExpiredError(uint256 expiredTime)
```

Thrown when an action is attempted on an offer that has already expired.

## TakingOfferTypeShouldBeSpecified

```solidity
error TakingOfferTypeShouldBeSpecified()
```

Thrown when the taking offer type is not specified.

## OfferHelper

This library provides functions to handle and validate offer operations within the SwarmX.eth Protocol.
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

_The library contains functions to ensure proper handling and validity of offers._

### buildOffer

```solidity
function buildOffer(struct OfferStruct offer, struct Asset depositAsset, struct Asset withdrawalAsset) external view returns (struct DotcOffer dotcOffer)
```

Builds a DOTC offer based on the provided parameters.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offer | struct OfferStruct | The structure containing offer details. |
| depositAsset | struct Asset | The asset being deposited. |
| withdrawalAsset | struct Asset | The asset being withdrawn. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| dotcOffer | struct DotcOffer | The constructed DOTC offer. |

### checkOfferStructure

```solidity
function checkOfferStructure(struct OfferStruct offer, struct Asset depositAsset, struct Asset withdrawalAsset) external view
```

Ensures that the offer structure is valid.

_Checks for asset type, asset address, and amount validity._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offer | struct OfferStruct | The offer to be checked. |
| depositAsset | struct Asset | The asset being deposited. |
| withdrawalAsset | struct Asset | The asset being withdrawn. |

### checkOfferParams

```solidity
function checkOfferParams(struct OfferStruct offer) external view
```

Ensures that the offer parameters are valid for taking the offer.

_Checks for offer expiration, special address authorization, and account authorization._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offer | struct OfferStruct | The offer to be checked. |

### checkAddressesArrayForZeroAddresses

```solidity
function checkAddressesArrayForZeroAddresses(address[] addressesArray) public pure
```

Checks an array of addresses for zero addresses.

_Reverts if any address in the array is the zero address._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| addressesArray | address[] | The array of addresses to be checked. |

