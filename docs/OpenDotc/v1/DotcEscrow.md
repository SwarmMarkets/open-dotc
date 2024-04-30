# Solidity API

## DotcEscrow

It allows for depositing, withdrawing, and managing of assets in the course of trading.
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

_This contract handles the escrow of assets for DOTC trades, supporting ERC20, ERC721, and ERC1155 assets._

### OfferDeposited

```solidity
event OfferDeposited(uint256 offerId, address maker, uint256 amount)
```

_Emitted when an offer's assets are deposited into escrow._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | Unique identifier of the offer. |
| maker | address | Address of the user who made the offer. |
| amount | uint256 | Amount of the asset deposited. |

### OfferWithdrawn

```solidity
event OfferWithdrawn(uint256 offerId, address taker, uint256 amount)
```

_Emitted when assets are withdrawn from escrow for an offer._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | Unique identifier of the offer. |
| taker | address | Address of the user who is taking the offer. |
| amount | uint256 | Amount of the asset withdrawn. |

### OfferCancelled

```solidity
event OfferCancelled(uint256 offerId, address maker, uint256 amountToWithdraw)
```

_Emitted when an offer is cancelled and its assets are returned._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | Unique identifier of the cancelled offer. |
| maker | address | Address of the user who made the offer. |
| amountToWithdraw | uint256 | Amount of the asset returned to the maker. |

### FeesWithdrew

```solidity
event FeesWithdrew(uint256 offerId, address to, uint256 amountToWithdraw)
```

_Emitted when fees are withdrawn from the escrow._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | Unique identifier of the relevant offer. |
| to | address | Address to which the fees are sent. |
| amountToWithdraw | uint256 | Amount of fees withdrawn. |

### ManagerAddressSet

```solidity
event ManagerAddressSet(address by, contract IDotcManager manager)
```

_Emitted when the manager address of the escrow is changed._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| by | address | Address of the user who changed the manager address. |
| manager | contract IDotcManager | New manager's address. |

### ESCROW_MANAGER_ROLE

```solidity
bytes32 ESCROW_MANAGER_ROLE
```

_Hash of the string "ESCROW_MANAGER_ROLE", used for access control._

### manager

```solidity
contract IDotcManager manager
```

_Reference to the DOTC Manager contract which governs this escrow._

### assetDeposits

```solidity
mapping(uint256 => struct Asset) assetDeposits
```

_Mapping from offer IDs to their corresponding deposited assets._

### onlyDotc

```solidity
modifier onlyDotc()
```

Ensures that the function is only callable by the DOTC contract.

_Modifier that restricts function access to the address of the DOTC contract set in the manager._

### constructor

```solidity
constructor() public
```

### initialize

```solidity
function initialize(contract IDotcManager _manager) public
```

Initializes the escrow contract with a DOTC Manager.

_Sets up the contract to handle ERC1155 and ERC721 tokens._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _manager | contract IDotcManager | Address of the DOTC Manager. |

### setDeposit

```solidity
function setDeposit(uint256 offerId, address maker, struct Asset asset) external returns (bool)
```

Sets the initial deposit for a maker's offer.

_Only callable by DOTC contract, ensures the asset is correctly deposited._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | The ID of the offer being deposited. |
| maker | address | The address of the maker making the deposit. |
| asset | struct Asset | The asset being deposited. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if the operation was successful. |

### withdrawDeposit

```solidity
function withdrawDeposit(uint256 offerId, uint256 amountToWithdraw, address taker) external returns (bool)
```

Withdraws a deposit from escrow to the taker's address.

_Ensures that the withdrawal is valid and transfers the asset to the taker._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | The ID of the offer being withdrawn. |
| amountToWithdraw | uint256 | Amount of the asset to withdraw. |
| taker | address | The address receiving the withdrawn assets. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if the operation was successful. |

### cancelDeposit

```solidity
function cancelDeposit(uint256 offerId, address maker) external returns (bool status, uint256 amountToCancel)
```

Cancels a deposit in escrow, returning it to the maker.

_Only callable by DOTC contract, ensures the asset is returned to the maker._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | The ID of the offer being cancelled. |
| maker | address | The address of the maker to return the assets to. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| status | bool | True if the operation was successful. |
| amountToCancel | uint256 | Amount of the asset returned to the maker. |

### withdrawFees

```solidity
function withdrawFees(uint256 offerId, uint256 amountToWithdraw) external returns (bool status)
```

Withdraws fee amount from escrow.

_Ensures that the fee withdrawal is valid and transfers the fee to the designated receiver._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | The ID of the offer related to the fees. |
| amountToWithdraw | uint256 | The amount of fees to withdraw. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| status | bool | True if the operation was successful. |

### changeManager

```solidity
function changeManager(contract IDotcManager _manager) external returns (bool status)
```

Changes the manager of the escrow contract.

_Ensures that only the current manager can perform this operation._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _manager | contract IDotcManager | The new manager's address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| status | bool | True if the operation was successful. |

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view returns (bool)
```

Checks if the contract supports a specific interface.

_Overridden to support AccessControl and ERC1155Receiver interfaces._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| interfaceId | bytes4 | The interface identifier to check. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if the interface is supported. |

