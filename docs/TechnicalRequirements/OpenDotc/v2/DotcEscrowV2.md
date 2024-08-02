# Solidity API

## AssetAmountEqZero

```solidity
error AssetAmountEqZero()
```

Indicates no asset amount was specified where a non-zero value is required.

## AmountToCancelEqZero

```solidity
error AmountToCancelEqZero()
```

Indicates no amount was specified for cancelling where a non-zero value is required.

## DotcEscrowV2

It allows for depositing, withdrawing, and managing of assets in the course of trading.

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

### manager

```solidity
contract DotcManagerV2 manager
```

_Address of the manager contract._

### dotc

```solidity
contract DotcV2 dotc
```

_Address of the dotc contract._

### escrowDeposits

```solidity
mapping(uint256 => struct EscrowDeposit) escrowDeposits
```

_Mapping from offer IDs to their corresponding deposited assets._

### onlyDotc

```solidity
modifier onlyDotc()
```

Ensures that the function is only callable by the DOTC contract.

_Modifier that restricts function access to the address of the DOTC contract._

### constructor

```solidity
constructor() public
```

### initialize

```solidity
function initialize(contract DotcManagerV2 _manager) public
```

Initializes the escrow contract with a fees parameters.

_Sets up the contract to handle ERC1155 and ERC721 tokens._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _manager | contract DotcManagerV2 | The address of the manager contract. |

### setDeposit

```solidity
function setDeposit(uint256 offerId, address maker, struct Asset asset) external
```

Sets the initial deposit for a maker's offer.

_Only callable by DOTC contract, ensures the asset is correctly deposited._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | The ID of the offer being deposited. |
| maker | address | The address of the maker making the deposit. |
| asset | struct Asset | The asset being deposited. |

### withdrawDeposit

```solidity
function withdrawDeposit(uint256 offerId, uint256 amountToWithdraw, address taker) external
```

Withdraws a deposit from escrow to the taker's address.

_Ensures that the withdrawal is valid and transfers the asset to the taker._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | The ID of the offer being withdrawn. |
| amountToWithdraw | uint256 | Amount of the asset to withdraw. |
| taker | address | The address receiving the withdrawn assets. |

### cancelDeposit

```solidity
function cancelDeposit(uint256 offerId, address maker) external returns (uint256 amountToCancel)
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
| amountToCancel | uint256 | Amount of the asset returned to the maker. |

### withdrawFees

```solidity
function withdrawFees(uint256 offerId, uint256 feesAmountToWithdraw, address to) public
```

Withdraws fee amount from escrow.

_Ensures that the fee withdrawal is valid and transfers the fee to the designated receiver._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | The ID of the offer related to the fees. |
| feesAmountToWithdraw | uint256 | The amount of fees to withdraw. |
| to | address | Address to which the fees are sent. |

### withdrawFees

```solidity
function withdrawFees(uint256 offerId, uint256 feesAmountToWithdraw) public
```

Withdraws fee amount from escrow to the default fee receiver.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | The ID of the offer related to the fees. |
| feesAmountToWithdraw | uint256 | The amount of fees to withdraw. |

### changeDotc

```solidity
function changeDotc(contract DotcV2 _dotc) external
```

Changes the DOTC contract address in the escrow contract.

_Ensures that only the manager can perform this operation._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _dotc | contract DotcV2 | The new DOTC contract's address. |

