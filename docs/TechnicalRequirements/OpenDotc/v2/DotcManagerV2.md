# Solidity API

## DotcManagerV2

This contract manages DOTC and escrow addresses, fee settings, and other configurations for the SwarmX.eth Protocol.
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

_This contract is upgradable and manages key configurations for the SwarmX.eth Protocol._

### DotcAddressSet

```solidity
event DotcAddressSet(address by, contract DotcV2 dotc)
```

_Emitted when the DOTC address is changed._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| by | address | Address of the user who changed the DOTC address. |
| dotc | contract DotcV2 | New DOTC's address. |

### EscrowAddressSet

```solidity
event EscrowAddressSet(address by, contract DotcEscrowV2 escrow)
```

_Emitted when the escrow address is changed._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| by | address | Address of the user who changed the escrow address. |
| escrow | contract DotcEscrowV2 | New escrow's address. |

### FeesReceiverSet

```solidity
event FeesReceiverSet(address by, address feeReceiver)
```

_Emitted when the fees receiver is changed._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| by | address | Address of the user who performed the update. |
| feeReceiver | address | New fees receiver's address. |

### FeesAmountSet

```solidity
event FeesAmountSet(address by, uint256 feeAmount)
```

_Emitted when the fees amount is changed._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| by | address | Address of the user who performed the update. |
| feeAmount | uint256 | New fees amount. |

### RevShareSet

```solidity
event RevShareSet(address by, uint256 revShareAmount)
```

_Emitted when the revenue share percentage is changed._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| by | address | Address of the user who performed the update. |
| revShareAmount | uint256 | New revenue share percentage. |

### dotc

```solidity
contract DotcV2 dotc
```

_Address of the DOTC contract._

### escrow

```solidity
contract DotcEscrowV2 escrow
```

_Address of the escrow contract._

### feeReceiver

```solidity
address feeReceiver
```

_Address to receive fees._

### feeAmount

```solidity
uint256 feeAmount
```

_Fee amount._

### revSharePercentage

```solidity
uint256 revSharePercentage
```

_Revenue share percentage._

### constructor

```solidity
constructor() public
```

### initialize

```solidity
function initialize(address _newFeeReceiver) public
```

Initializes the DotcManager contract with a fee receiver address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _newFeeReceiver | address | The address of the fee receiver. |

### changeDotc

```solidity
function changeDotc(contract DotcV2 _dotc) external
```

Changes the DOTC contract address.

_Ensures that the new address is not zero._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _dotc | contract DotcV2 | The new DOTC contract's address. |

### changeEscrow

```solidity
function changeEscrow(contract DotcEscrowV2 _escrow) external
```

Changes the escrow contract address.

_Ensures that the new address is not zero._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _escrow | contract DotcEscrowV2 | The new escrow contract's address. |

### changeDotcInEscrow

```solidity
function changeDotcInEscrow() external
```

Changes the DOTC address in the escrow contract.

_Ensures that only the current owner can perform this operation._

### changeEscrowInDotc

```solidity
function changeEscrowInDotc() external
```

Changes the escrow address in the DOTC contract.

_Ensures that only the current owner can perform this operation._

### changeFees

```solidity
function changeFees(address _newFeeReceiver, uint256 _feeAmount, uint256 _revShare) external
```

Changes the fee settings for the contract.

_Requires caller to be the owner of the contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _newFeeReceiver | address | The new fee receiver address. |
| _feeAmount | uint256 | The new fee amount. |
| _revShare | uint256 | The new revenue share percentage. |

