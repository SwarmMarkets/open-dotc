# Solidity API

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
ERC721 tokens should have an amount of exactly one.

## OfferValidityError

```solidity
error OfferValidityError(uint256 offerId, enum ValidityType _type)
```

Thrown when an offer encounters a validity-related issue.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | The ID of the offer associated with the error. |
| _type | enum ValidityType | The type of validity error encountered, represented as an enum of `ValidityType`. |

## OfferExpiredError

```solidity
error OfferExpiredError(uint256 offerId)
```

Thrown when an action is attempted on an offer that has already expired.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | The ID of the offer associated with the error. |

## OfferInTimelockError

```solidity
error OfferInTimelockError(uint256 offerId)
```

Thrown when an action is attempted on an offer that is still within its timelock period.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | The ID of the offer associated with the error. |

## OfferExpiredTimestampError

```solidity
error OfferExpiredTimestampError(uint256 timestamp)
```

Thrown when an action is attempted on an offer with an expired timestamp.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| timestamp | uint256 | The expired timestamp for the offer. |

## IncorrectTimelockPeriodError

```solidity
error IncorrectTimelockPeriodError(uint256 timelock)
```

Thrown when the timelock period of an offer is set incorrectly.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| timelock | uint256 | The incorrect timelock period for the offer. |

## UnsupportedPartialOfferForNonERC20AssetsError

```solidity
error UnsupportedPartialOfferForNonERC20AssetsError()
```

Thrown when a partial offer type is attempted with ERC721 or ERC1155 assets, which is unsupported.

## EscrowCallFailedError

```solidity
error EscrowCallFailedError(enum EscrowCallType _type)
```

Thrown when the call to escrow fails.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _type | enum EscrowCallType | The type of escrow call that failed. |

## OfferAddressIsZeroError

```solidity
error OfferAddressIsZeroError(uint256 arrayIndex)
```

Thrown when the offer address is set to the zero address.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| arrayIndex | uint256 | The index in the array where the zero address was encountered. |

## NotSpecialAddressError

```solidity
error NotSpecialAddressError()
```

Thrown when a non-special address attempts to take a special offer.

## FeeAmountIsZeroError

```solidity
error FeeAmountIsZeroError()
```

Thrown when the calculated fee amount is zero or less.

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

## EscrowDepositWithdrawalFailedError

```solidity
error EscrowDepositWithdrawalFailedError()
```

Thrown when withdrawal of deposit assets from the escrow fails.

## OnlyMakerAllowedError

```solidity
error OnlyMakerAllowedError(address maker)
```

Thrown when a non-maker tries to perform an action on their own offer.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| maker | address | The address of the offer's maker. |

## ERC721OfferAmountChangeError

```solidity
error ERC721OfferAmountChangeError()
```

Thrown when there's an attempt to change the amount of an ERC721 offer.

## ManagerOnlyFunctionError

```solidity
error ManagerOnlyFunctionError()
```

Thrown when a non-manager tries to call a manager-only function.

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
event CreatedOffer(address maker, uint256 offerId, bool isFullType, struct Asset depositAsset, struct Asset withdrawalAsset, address[] specialAddresses, uint256 expiryTimestamp, uint256 timelockPeriod)
```

Emitted when a new trading offer is created.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| maker | address | Address of the user creating the offer. |
| offerId | uint256 | Unique identifier of the created offer. |
| isFullType | bool | Indicates if the offer is of a full type. |
| depositAsset | struct Asset | Asset to be deposited by the maker. |
| withdrawalAsset | struct Asset | Asset to be withdrawn by the maker. |
| specialAddresses | address[] | Special addresses involved in the trade, if any. |
| expiryTimestamp | uint256 | Expiry time of the offer. |
| timelockPeriod | uint256 | Timelock period for the offer. |

### TakenOffer

```solidity
event TakenOffer(uint256 offerId, address takenBy, bool isFullyTaken, uint256 amountToReceive, uint256 amountPaid)
```

Emitted when an offer is successfully taken.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | Unique identifier of the taken offer. |
| takenBy | address | Address of the user taking the offer. |
| isFullyTaken | bool | Indicates if the offer is fully taken. |
| amountToReceive | uint256 | Amount received in the trade. |
| amountPaid | uint256 | Amount paid to take the offer. |

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

Emitted when the Term and Comms links for an offer is updated.

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

Emitted when the array of special addresses of an offer is udpated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | Unique identifier of the offer with updated links. |
| specialAddresses | address[] | The new special addresses of the offer. |

### ManagerAddressSet

```solidity
event ManagerAddressSet(address by, contract IDotcManager manager)
```

Emitted when the manager address is changed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| by | address | Address of the user who changed the manager address. |
| manager | contract IDotcManager | New manager's address. |

### manager

```solidity
contract IDotcManager manager
```

The instance of IDotcManager that manages this contract.

_Holds the address of the manager contract which provides key functionalities like escrow management._

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

### timelock

```solidity
mapping(uint256 => uint256) timelock
```

Stores the timelock period for each offer.

_Maps an offer ID to its timelock period._

### currentOfferId

```solidity
uint256 currentOfferId
```

Tracks the ID to be assigned to the next created offer.

_Incremented with each new offer, ensuring unique IDs for all offers._

### onlyMaker

```solidity
modifier onlyMaker(uint256 offerId)
```

Ensures that the caller to the offer is maker of this offer.

_Checks if the offer exists and has not been fully taken._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | The ID of the offer to be checked. |

### checkAssetStructure

```solidity
modifier checkAssetStructure(struct Asset asset)
```

Ensures that the asset structure is valid.

_Checks for asset type, asset address, and amount validity._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | struct Asset | The asset to be checked. |

### checkOfferStructure

```solidity
modifier checkOfferStructure(struct OfferStruct offer)
```

Ensures that the offer structure is valid.

_Checks for asset type, asset address, and amount validity._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offer | struct OfferStruct | The offer to be checked. |

### checkOffer

```solidity
modifier checkOffer(uint256 offerId)
```

Ensures that the offer is valid and available.

_Checks if the offer exists and has not been fully taken._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | The ID of the offer to be checked. |

### notExpired

```solidity
modifier notExpired(uint256 offerId)
```

Checks if the offer has not expired.

_Ensures the current time is before the offer's expiry time._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | The ID of the offer to check for expiry. |

### timelockPassed

```solidity
modifier timelockPassed(uint256 offerId)
```

Ensures that the timelock period of the offer has passed.

_Checks if the current time is beyond the offer's timelock period._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | The ID of the offer to check for timelock expiry. |

### constructor

```solidity
constructor() public
```

### initialize

```solidity
function initialize(contract IDotcManager _manager) public
```

Initializes the contract with a given manager.

_Sets up the reentrancy guard and ERC token holder functionalities._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _manager | contract IDotcManager | The address of the manager to be set for this contract. |

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

### takeOffer

```solidity
function takeOffer(uint256 offerId, uint256 amountToSend) public
```

Allows a user to take an available offer.

_Handles the transfer of assets between maker and taker._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | The ID of the offer to take. |
| amountToSend | uint256 | The amount of the withdrawal asset to send. |

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

### updateOffer

```solidity
function updateOffer(uint256 offerId, uint256 newAmount, struct OfferStruct updatedOffer) external returns (bool status)
```

Updates an existing offer's details.

_Only the maker of the offer can update it._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | The ID of the offer to update. |
| newAmount | uint256 | New amount for the withdrawal asset. |
| updatedOffer | struct OfferStruct | A structure for the update the offer. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| status | bool | Boolean indicating the success of the operation. |

### changeManager

```solidity
function changeManager(contract IDotcManager _manager) external returns (bool status)
```

Changes the manager of the contract.

_Can only be called by the current manager._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _manager | contract IDotcManager | The new manager address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| status | bool | Boolean indicating the success of the operation. |

### getOffersFromAddress

```solidity
function getOffersFromAddress(address account) external view returns (uint256[])
```

Retrieves all offers made by a specific address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address to query offers for. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256[] | A list of offer IDs created by the given account. |

### getOfferOwner

```solidity
function getOfferOwner(uint256 offerId) external view returns (address maker)
```

Gets the owner (maker) of a specific offer.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | The ID of the offer. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| maker | address | The address of the offer's maker. |

### getOffer

```solidity
function getOffer(uint256 offerId) external view returns (struct DotcOffer offer)
```

Retrieves details of a specific offer.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | The ID of the offer to retrieve. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| offer | struct DotcOffer | The details of the specified offer. |

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view returns (bool)
```

Checks if the contract supports a specific interface.

_Overridden to support ERC1155Receiver interfaces._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| interfaceId | bytes4 | The interface identifier to check. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if the interface is supported. |

