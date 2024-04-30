# Solidity API

## ZeroAmountPassed

```solidity
error ZeroAmountPassed()
```

Indicates an operation with zero amount which is not allowed

## ZeroAddressPassed

```solidity
error ZeroAddressPassed()
```

Indicates usage of a zero address where an actual address is required

## AddressHaveNoERC20

```solidity
error AddressHaveNoERC20(address account, address erc20Token, uint256 currentAmount, uint256 requiredAmount)
```

Indicates the account does not have enough ERC20 tokens required

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The account in question |
| erc20Token | address | The ERC20 token address |
| currentAmount | uint256 | The current amount the account holds |
| requiredAmount | uint256 | The required amount that was not met |

## AddressHaveNoERC721

```solidity
error AddressHaveNoERC721(address account, address erc721Token, uint256 tokenId)
```

Indicates the account does not own the specified ERC721 token

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The account in question |
| erc721Token | address | The ERC721 token address |
| tokenId | uint256 | The token ID that the account does not own |

## AddressHaveNoERC1155

```solidity
error AddressHaveNoERC1155(address account, address erc1155Token, uint256 tokenId, uint256 currentAmount, uint256 requiredAmount)
```

Indicates the account does not have enough of the specified ERC1155 token

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The account in question |
| erc1155Token | address | The ERC1155 token address |
| tokenId | uint256 | The token ID in question |
| currentAmount | uint256 | The current amount the account holds |
| requiredAmount | uint256 | The required amount that was not met |

## IncorrectAssetTypeForAddress

```solidity
error IncorrectAssetTypeForAddress(address token, enum AssetType incorrectType)
```

Indicates that the token address does not match the expected asset type

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The token address |
| incorrectType | enum AssetType | The incorrect asset type provided |

## ChangeEscrowManagerError

```solidity
error ChangeEscrowManagerError()
```

Indicates when an unauthorized attempt is made to change the escrow manager

## ChangeDotcManagerError

```solidity
error ChangeDotcManagerError()
```

Indicates when an unauthorized attempt is made to change the DOTC manager

## DotcManagerV2

This contract serves as the central point for managing various aspects of the DOTC system
such as fees, escrow addresses, and asset standardization.
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

_Manages configurations and settings for the DOTC trading platform, including fee settings and escrow management._

### EscrowAddressSet

```solidity
event EscrowAddressSet(address by, contract IDotcEscrow escrow)
```

_Emitted when the escrow address is updated._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| by | address | Address of the user who performed the update. |
| escrow | contract IDotcEscrow | New escrow address. |

### DotcSet

```solidity
event DotcSet(address by, contract IDotc Dotc)
```

_Emitted when the DOTC contract address is updated._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| by | address | Address of the user who performed the update. |
| Dotc | contract IDotc | New DOTC contract address. |

### FeeReceiverSet

```solidity
event FeeReceiverSet(address by, address newFeeReceiver)
```

_Emitted when the fee receiver address is updated._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| by | address | Address of the user who performed the update. |
| newFeeReceiver | address | New fee receiver address. |

### FeeAmountSet

```solidity
event FeeAmountSet(address by, uint256 feeAmount)
```

_Emitted when the fee amount is updated._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| by | address | Address of the user who performed the update. |
| feeAmount | uint256 | New fee amount. |

### ManagerAddressSet

```solidity
event ManagerAddressSet(address by, contract IDotcManager manager)
```

_Emitted when the manager address is updated._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| by | address | Address of the user who performed the update. |
| manager | contract IDotcManager | New manager address. |

### BPS

```solidity
uint256 BPS
```

_Base points used to standardize decimals._

### DECIMALS

```solidity
uint256 DECIMALS
```

_Standard decimal places used in Swarm._

### dotc

```solidity
contract IDotc dotc
```

_Address of the DOTC contract._

### escrow

```solidity
contract IDotcEscrow escrow
```

_Address of the escrow contract._

### feeReceiver

```solidity
address feeReceiver
```

_Address where trading fees are sent._

### feeAmount

```solidity
uint256 feeAmount
```

_Amount of fees charged for trading._

### zeroAddressCheck

```solidity
modifier zeroAddressCheck(address _address)
```

Ensures that the given address is not the zero address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _address | address | The address to check. |

### zeroAmountCheck

```solidity
modifier zeroAmountCheck(uint256 amount)
```

Ensures that the given amount is greater than zero.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The amount to check. |

### constructor

```solidity
constructor() public
```

### initialize

```solidity
function initialize(address _newFeeReceiver) public
```

Initializes the DotcManager contract.

_Sets up the contract with default values and fee receiver._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _newFeeReceiver | address | The initial address for receiving fees. |

### changeEscrowAddress

```solidity
function changeEscrowAddress(contract IDotcEscrow _escrow) external returns (bool status)
```

Updates the address of the escrow contract.

_Requires caller to be the owner of the contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _escrow | contract IDotcEscrow | The new escrow contract address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| status | bool | True if the operation was successful. |

### changeDotcAddress

```solidity
function changeDotcAddress(contract IDotc _dotc) external returns (bool status)
```

Updates the address of the DOTC contract.

_Requires caller to be the owner of the contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _dotc | contract IDotc | The new DOTC contract address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| status | bool | True if the operation was successful. |

### changeFeeReceiver

```solidity
function changeFeeReceiver(address _newFeeReceiver) external returns (bool status)
```

Updates the address for receiving trading fees.

_Requires caller to be the owner of the contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _newFeeReceiver | address | The new fee receiver address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| status | bool | True if the operation was successful. |

### changeFeeAmount

```solidity
function changeFeeAmount(uint256 _feeAmount) external returns (bool status)
```

Updates the trading fee amount.

_Requires caller to be the owner of the contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _feeAmount | uint256 | The new fee amount. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| status | bool | True if the operation was successful. |

### changeManagerInContracts

```solidity
function changeManagerInContracts(contract IDotcManager _manager) external returns (bool status)
```

Updates the manager address in the DOTC and escrow contracts.

_Requires caller to be the owner and ensures the new manager address is valid._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _manager | contract IDotcManager | The new manager address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| status | bool | True if the operation was successful. |

### checkAssetOwner

```solidity
function checkAssetOwner(struct Asset asset, address account, uint256 amount) external view returns (enum AssetType)
```

Checks if the specified account is the owner of the specified asset.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | struct Asset | The asset to check. |
| account | address | The account to verify ownership. |
| amount | uint256 |  |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | enum AssetType | The type of the asset if the account owns it. |

### standardizeAsset

```solidity
function standardizeAsset(struct Asset asset) external view returns (uint256 amount)
```

Standardizes the amount of an asset based on its type.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | struct Asset | The asset to standardize. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The standardized amount of the asset. |

### standardizeAsset

```solidity
function standardizeAsset(struct Asset asset, address assetOwner) external view returns (uint256 amount)
```

Standardizes the amount of an asset based on its type with checking the ownership of this asset.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | struct Asset | The asset to standardize. |
| assetOwner | address | The address to check. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The standardized amount of the asset. |

### unstandardizeAsset

```solidity
function unstandardizeAsset(struct Asset asset) public view returns (uint256 amount)
```

Converts the standardized amount of an asset back to its original form.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | struct Asset | The asset to unstandardize. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The unstandardized amount of the asset. |

### standardizeNumber

```solidity
function standardizeNumber(uint256 amount, address token) public view returns (uint256)
```

Standardizes a numerical amount based on token decimals.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The amount to standardize. |
| token | address | The address of the token. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The standardized numerical amount. |

### standardizeNumber

```solidity
function standardizeNumber(uint256 amount, uint8 decimals) external pure returns (uint256)
```

Standardizes a numerical amount based on token decimals.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The amount to standardize. |
| decimals | uint8 | The decimals of the token. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The standardized numerical amount. |

### unstandardizeNumber

```solidity
function unstandardizeNumber(uint256 amount, address token) public view returns (uint256)
```

Converts a standardized numerical amount back to its original form based on token decimals.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The amount to unstandardize. |
| token | address | The address of the token. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The unstandardized numerical amount. |

### unstandardizeNumber

```solidity
function unstandardizeNumber(uint256 amount, uint8 decimals) external pure returns (uint256)
```

Converts a standardized numerical amount back to its original form based on token decimals.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The amount to unstandardize. |
| decimals | uint8 | The decimals of the token. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The unstandardized numerical amount. |

