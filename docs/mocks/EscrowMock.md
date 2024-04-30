# Solidity API

## EscrowFalseMock

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

