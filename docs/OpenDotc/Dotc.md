# Solidity API

## Dotc

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
event CreatedOffer(address maker, uint256 offerId, bool isFullType, struct Asset depositAsset, struct Asset withdrawalAsset, address specialAddress, uint256 expiryTime, uint256 timelockPeriod)
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
| specialAddress | address | A special address involved in the trade, if any. |
| expiryTime | uint256 | Expiry time of the offer. |
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

### OfferUpdated

```solidity
event OfferUpdated(uint256 offerId, uint256 newOffer)
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
function makeOffer(struct Asset depositAsset, struct Asset withdrawalAsset, bool _isFullType, address _specialAddress, uint256 _expiryTimestamp, uint256 _timelockPeriod) external
```

Creates a new trading offer with specified assets and conditions.

_Validates asset structure and initializes a new offer._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| depositAsset | struct Asset | The asset to be deposited by the maker. |
| withdrawalAsset | struct Asset | The asset desired by the maker in exchange. |
| _isFullType | bool | Boolean indicating if the offer is for the full amount. |
| _specialAddress | address | An optional specific address allowed to take the offer. |
| _expiryTimestamp | uint256 | Timestamp when the offer expires. |
| _timelockPeriod | uint256 | Period before which the offer cannot be taken. |

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
function updateOffer(uint256 offerId, uint256 newAmount, uint256 _expiryTimestamp, uint256 _timelockPeriod) external returns (bool status)
```

Updates an existing offer's details.

_Only the maker of the offer can update it._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | The ID of the offer to update. |
| newAmount | uint256 | New amount for the withdrawal asset. |
| _expiryTimestamp | uint256 | New expiry timestamp for the offer. |
| _timelockPeriod | uint256 | New timelock period for the offer. |

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

