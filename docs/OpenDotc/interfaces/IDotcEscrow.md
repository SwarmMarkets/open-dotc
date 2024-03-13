# Solidity API

## IDotcEscrow

This interface is implemented by the Escrow contract in the DOTC trading system
to handle asset custody during trades.
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

_Defines the interface for the Dotc Escrow contract, outlining the key functionalities
for managing asset deposits and withdrawals._

### setDeposit

```solidity
function setDeposit(uint256 offerId, address maker, struct Asset asset) external returns (bool)
```

Sets the initial deposit of an asset by the maker for a specific offer.

_Stores the asset deposited by the maker in the escrow for a given offer.
REQUIRE: The sender must have the ESCROW_MANAGER_ROLE and the DOTC_ADMIN_ROLE._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | The ID of the offer for which the deposit is being made. |
| maker | address | The address of the offer's maker. |
| asset | struct Asset | The asset being deposited. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | bool True if the deposit is successfully set. |

### withdrawDeposit

```solidity
function withdrawDeposit(uint256 offerId, uint256 amountToWithdraw, address taker) external returns (bool)
```

Withdraws a deposited asset from the escrow to the taker's address.

_Handles the transfer of assets from escrow to the taker upon successful trade.
REQUIRE: The sender must have the ESCROW_MANAGER_ROLE and the DOTC_ADMIN_ROLE._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | The ID of the offer for which the withdrawal is being made. |
| amountToWithdraw | uint256 | The amount of the asset to be withdrawn. |
| taker | address | The address of the taker to receive the withdrawn assets. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if the withdrawal is successful. |

### cancelDeposit

```solidity
function cancelDeposit(uint256 offerId, address maker) external returns (bool status, uint256 amountToWithdraw)
```

Cancels a deposit in the escrow, returning the assets to the maker.

_Reverses the asset deposit, sending the assets back to the maker of the offer.
REQUIRE The sender must have the ESCROW_MANAGER_ROLE and the DOTC_ADMIN_ROLE._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | The ID of the offer for which the deposit is being cancelled. |
| maker | address | The address of the offer's maker. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| status | bool | True if the cancellation is successful. |
| amountToWithdraw | uint256 | The amount of assets returned to the maker. |

### withdrawFees

```solidity
function withdrawFees(uint256 offerId, uint256 amountToWithdraw) external returns (bool status)
```

Withdraws fees from the escrow.

_Handles the transfer of fee amounts from escrow to the designated fee receiver._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | The ID of the offer related to the fees. |
| amountToWithdraw | uint256 | The amount of fees to be withdrawn. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| status | bool | True if the fee withdrawal is successful. |

### changeManager

```solidity
function changeManager(contract IDotcManager _manager) external returns (bool status)
```

Changes the manager of the escrow contract.

_Updates the DotcManager address linked to the escrow contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _manager | contract IDotcManager | The new manager's address to be set. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| status | bool | True if the manager is successfully changed. |

