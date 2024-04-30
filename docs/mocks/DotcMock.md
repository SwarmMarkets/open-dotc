# Solidity API

## DotcFalseMock

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

## DotcTrueMock

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

