# Solidity API

## EscrowCallType

Defines the different types of calls that can be made to the escrow in the DOTC system.

_Enum representing various escrow call types such as deposit, withdraw, and cancel operations.
- Deposit: Represents a call to deposit assets into escrow.
- Withdraw: Represents a call to withdraw assets from escrow.
- Cancel: Represents a call to cancel an operation in the escrow._

```solidity
enum EscrowCallType {
  Deposit,
  Withdraw,
  Cancel
}
```

## ValidityType

Defines the types of validity states an offer can have in the DOTC system.

_Enum representing different states of offer validity, like non-existent or fully taken.
- NotExist: Indicates the offer does not exist.
- FullyTaken: Indicates the offer has been fully taken._

```solidity
enum ValidityType {
  NotExist,
  FullyTaken
}
```

## TimeConstraintType

Defines the types of time constraints an offer can have in the DOTC system.

_Enum representing different time-related constraints for offers.
- Expired: Indicates the offer has expired.
- TimelockGreaterThanExpirationTime: Indicates the timelock is greater than the offer's expiration time.
- InTimelock: Indicates the offer is currently in its timelock period.
- IncorrectTimelock: Indicates an incorrect setting of the timelock period._

```solidity
enum TimeConstraintType {
  Expired,
  TimelockGreaterThanExpirationTime,
  InTimelock,
  IncorrectTimelock
}
```

## OfferStruct

Describes the structure of an offer within the DOTC trading system.

_Structure encapsulating details of an offer, including its type, special conditions, and timing constraints._

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct OfferStruct {
  bool isFullType;
  address[] specialAddresses;
  uint256 expiryTimestamp;
  uint256 timelockPeriod;
  string terms;
  string commsLink;
}
```

## DotcOffer

Detailed structure of an offer in the DOTC trading system.

_Contains comprehensive information about an offer, including assets involved and trade conditions._

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct DotcOffer {
  address maker;
  bool isFullyTaken;
  uint256 availableAmount;
  uint256 unitPrice;
  struct Asset depositAsset;
  struct Asset withdrawalAsset;
  struct OfferStruct offer;
}
```

