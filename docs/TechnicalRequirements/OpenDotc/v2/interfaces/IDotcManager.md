# Solidity API

## IDotcManager

This interface provides methods for managing assets, fees, and linking core DOTC
components like the DOTC contract and the Escrow contract.
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

_Defines the interface for the DOTC Manager contract, outlining key functionalities
for managing DOTC configurations._

### BPS

```solidity
function BPS() external view returns (uint256)
```

Gets the base point scale used for calculations.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The base point scale (BPS) value. |

### DECIMALS

```solidity
function DECIMALS() external view returns (uint256)
```

Gets the standard decimal precision used in calculations.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The standard decimal precision value. |

### feeAmount

```solidity
function feeAmount() external view returns (uint256)
```

Gets the current fee amount used in transactions.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The current transaction fee amount. |

### dotc

```solidity
function dotc() external view returns (contract IDotc)
```

Gets the address of the DOTC contract.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | contract IDotc | The address of the DOTC contract. |

### escrow

```solidity
function escrow() external view returns (contract IDotcEscrow)
```

Gets the address of the DOTC Escrow contract.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | contract IDotcEscrow | The address of the DOTC Escrow contract. |

### feeReceiver

```solidity
function feeReceiver() external view returns (address)
```

Gets the address where transaction fees are sent.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the fee receiver. |

### checkAssetOwner

```solidity
function checkAssetOwner(struct Asset asset, address account, uint256 amount) external view returns (enum AssetType assetType)
```

Checks if a given account is the owner of a specified asset.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | struct Asset | The asset to check ownership of. |
| account | address | The account to verify for ownership. |
| amount | uint256 |  |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| assetType | enum AssetType | The type of the asset if the account is the owner. |

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
function unstandardizeAsset(struct Asset asset) external view returns (uint256 amount)
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
function standardizeNumber(uint256 amount, address token) external view returns (uint256)
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
function standardizeNumber(uint256 amount, uint8 decimals) external view returns (uint256)
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
function unstandardizeNumber(uint256 amount, address token) external view returns (uint256)
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
function unstandardizeNumber(uint256 amount, uint8 decimals) external view returns (uint256)
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

