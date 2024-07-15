# Solidity API

## EscrowCallFailedError

```solidity
error EscrowCallFailedError()
```

Thrown when the call to escrow fails.

## AmountWithoutFeesIsZeroError

```solidity
error AmountWithoutFeesIsZeroError()
```

Thrown when the amount to pay, excluding fees, is zero or less.

## IncorrectFullOfferAmountError

```solidity
error IncorrectFullOfferAmountError(uint256 providedAmount)
```

Thrown when the amount to send does not match the required amount for a full offer.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| providedAmount | uint256 | The incorrect amount provided for the full offer. |

## ERC721OfferAmountChangeError

```solidity
error ERC721OfferAmountChangeError()
```

Thrown when there's an attempt to change the amount of an ERC721 offer.

## OnlyEscrow

```solidity
error OnlyEscrow()
```

Indicates that the operation was attempted by an unauthorized entity, not the Escrow contract.

## OnlyDynamicPricing

```solidity
error OnlyDynamicPricing()
```

Indicates that the operation was attempted by an unauthorized entity, not permitted for dynamic pricing.

## DotcV2

This contract handles decentralized over-the-counter trading.
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

_It uses ERC1155 and ERC721 token standards for asset management and trade settlement._

### CreatedOffer

```solidity
event CreatedOffer(address maker, uint256 offerId, struct Asset depositAsset, struct Asset withdrawalAsset, struct OfferStruct offer)
```

Emitted when a new trading offer is created.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| maker | address | Address of the user creating the offer. |
| offerId | uint256 | Unique identifier of the created offer. |
| depositAsset | struct Asset | Asset to be deposited by the maker. |
| withdrawalAsset | struct Asset | Asset to be withdrawn by the maker. |
| offer | struct OfferStruct | Offer details. |

### TakenOffer

```solidity
event TakenOffer(uint256 offerId, address takenBy, enum OfferFillType offerFillType, uint256 amountToReceive, uint256 amountPaid, address affiliate)
```

Emitted when an offer is successfully taken.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | Unique identifier of the taken offer. |
| takenBy | address | Address of the user taking the offer. |
| offerFillType | enum OfferFillType | Indicates if the offer is fully taken. |
| amountToReceive | uint256 | Amount received in the trade. |
| amountPaid | uint256 | Amount paid to take the offer. |
| affiliate | address | Address of the affiliate involved in the trade. |

### CanceledOffer

```solidity
event CanceledOffer(uint256 offerId, address canceledBy, uint256 amountToReceive)
```

Emitted when an offer is canceled.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | Unique identifier of the canceled offer. |
| canceledBy | address | Address of the user who canceled the offer. |
| amountToReceive | uint256 | Amount that was to be received from the offer. |

### OfferAmountUpdated

```solidity
event OfferAmountUpdated(uint256 offerId, uint256 newOffer)
```

Emitted when an existing offer is updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | Unique identifier of the updated offer. |
| newOffer | uint256 | Details of the new offer. |

### UpdatedOfferExpiry

```solidity
event UpdatedOfferExpiry(uint256 offerId, uint256 newExpiryTimestamp)
```

Emitted when the expiry time of an offer is updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | Unique identifier of the offer with updated expiry. |
| newExpiryTimestamp | uint256 | The new expiry timestamp of the offer. |

### UpdatedTimeLockPeriod

```solidity
event UpdatedTimeLockPeriod(uint256 offerId, uint256 newTimelockPeriod)
```

Emitted when the timelock period of an offer is updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | Unique identifier of the offer with updated timelock. |
| newTimelockPeriod | uint256 | The new timelock period of the offer. |

### OfferLinksUpdated

```solidity
event OfferLinksUpdated(uint256 offerId, string newTerms, string newCommsLink)
```

Emitted when the Term and Comms links for an offer are updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | Unique identifier of the offer with updated links. |
| newTerms | string | The new terms for the offer. |
| newCommsLink | string | The new comms link for the offer. |

### OfferSpecialAddressesUpdated

```solidity
event OfferSpecialAddressesUpdated(uint256 offerId, address[] specialAddresses)
```

Emitted when the array of special addresses of an offer is updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | Unique identifier of the offer with updated links. |
| specialAddresses | address[] | The new special addresses of the offer. |

### OfferAuthAddressesUpdated

```solidity
event OfferAuthAddressesUpdated(uint256 offerId, address[] authAddresses)
```

Emitted when the array of special addresses of an offer is updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | Unique identifier of the offer with updated links. |
| authAddresses | address[] | The new auth addresses of the offer. |

### manager

```solidity
contract DotcManagerV2 manager
```

_Address of the manager contract._

### escrow

```solidity
contract DotcEscrowV2 escrow
```

_Address of the escrow contract._

### allOffers

```solidity
mapping(uint256 => struct DotcOffer) allOffers
```

Stores all the offers ever created.

_Maps an offer ID to its corresponding DotcOffer structure._

### offersFromAddress

```solidity
mapping(address => uint256[]) offersFromAddress
```

Keeps track of all offers created by a specific address.

_Maps an address to an array of offer IDs created by that address._

### currentOfferId

```solidity
uint256 currentOfferId
```

Tracks the ID to be assigned to the next created offer.

_Incremented with each new offer, ensuring unique IDs for all offers._

### constructor

```solidity
constructor() public
```

### initialize

```solidity
function initialize(contract DotcManagerV2 _manager) public
```

Initializes the contract with a given manager.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _manager | contract DotcManagerV2 | The address of the manager to be set for this contract. |

### makeOffer

```solidity
function makeOffer(struct Asset depositAsset, struct Asset withdrawalAsset, struct OfferStruct offer) external
```

Creates a new trading offer with specified assets and conditions.

_Validates asset structure and initializes a new offer._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| depositAsset | struct Asset | The asset to be deposited by the maker. |
| withdrawalAsset | struct Asset | The asset desired by the maker in exchange. |
| offer | struct OfferStruct | Offer Struct. |

### takeOfferFixed

```solidity
function takeOfferFixed(uint256 offerId, uint256 withdrawalAmountPaid, address affiliate) public
```

Takes a fixed price offer.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | The ID of the offer to take. |
| withdrawalAmountPaid | uint256 | The amount paid to withdraw the asset. |
| affiliate | address | The address of the affiliate. |

### takeOfferDynamic

```solidity
function takeOfferDynamic(uint256 offerId, uint256 withdrawalAmountPaid, address affiliate) public
```

Takes a dynamic price offer.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | The ID of the offer to take. |
| withdrawalAmountPaid | uint256 | The amount paid to withdraw the asset. |
| affiliate | address | The address of the affiliate. |

### updateOffer

```solidity
function updateOffer(uint256 offerId, struct OfferStruct updatedOffer) external
```

Updates an existing offer's details.

_Only the maker of the offer can update it._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | The ID of the offer to update. |
| updatedOffer | struct OfferStruct | A structure for the update the offer. |

### cancelOffer

```solidity
function cancelOffer(uint256 offerId) external
```

Cancels an offer and refunds the maker.

_Can only be called by the offer's maker and when the timelock has passed._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | The ID of the offer to cancel. |

### changeEscrow

```solidity
function changeEscrow(contract DotcEscrowV2 _escrow) external
```

Changes the escrow address.

_Ensures that only the current owner can perform this operation._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _escrow | contract DotcEscrowV2 | The new escrow's address. |

