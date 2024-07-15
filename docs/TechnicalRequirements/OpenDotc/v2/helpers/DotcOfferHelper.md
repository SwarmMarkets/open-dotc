# Solidity API

## OfferValidityError

```solidity
error OfferValidityError(enum OfferFillType offerFillType)
```

Thrown when an offer encounters a validity-related issue.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerFillType | enum OfferFillType | The type of validity error encountered, represented as an enum of `OfferFillType`. |

## OnlyMakerAllowedError

```solidity
error OnlyMakerAllowedError(address maker)
```

Thrown when a non-maker tries to perform an action on their own offer.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| maker | address | The address of the offer's maker. |

## OfferInTimelockError

```solidity
error OfferInTimelockError(uint256 currentUnixTime)
```

Thrown when an action is attempted on an offer that is still within its timelock period.

## DotcOfferHelper

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

### checkDotcOfferParams

```solidity
function checkDotcOfferParams(struct DotcOffer offer) external view
```

Ensures that the offer parameters are valid and that the offer can be interacted with.

_Checks if the offer exists and has not been fully taken or cancelled.
     Verifies that the current time is beyond the offer's timelock period._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offer | struct DotcOffer | The offer to be checked. |

### onlyMaker

```solidity
function onlyMaker(struct DotcOffer offer) external view
```

Ensures that the caller is the maker of the offer.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offer | struct DotcOffer | The offer to check the maker against. |

