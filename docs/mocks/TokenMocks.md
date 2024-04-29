# Solidity API

## ERC20Mock

### constructor

```solidity
constructor(string _name, string sym, uint256 initialSupply, uint8 decimals) public
```

### mint

```solidity
function mint(address to, uint256 amount) public
```

## ERC20Mock_2

### constructor

```solidity
constructor() public
```

### mint

```solidity
function mint(address to, uint256 amount) public
```

## ERC20Mock_3

### constructor

```solidity
constructor(uint8 decimals_) public
```

### decimals

```solidity
function decimals() public view returns (uint8)
```

_Returns the number of decimals used to get its user representation.
For example, if `decimals` equals `2`, a balance of `505` tokens should
be displayed to a user as `5.05` (`505 / 10 ** 2`).

Tokens usually opt for a value of 18, imitating the relationship between
Ether and Wei. This is the value {ERC20} uses, unless this function is
overridden;

NOTE: This information is only used for _display_ purposes: it in
no way affects any of the arithmetic of the contract, including
{IERC20-balanceOf} and {IERC20-transfer}._

### mint

```solidity
function mint(address to, uint256 amount) public
```

## ERC721Mock

### constructor

```solidity
constructor() public
```

### mint

```solidity
function mint(address to, uint256 tokenId) public
```

## ERC1155Mock

### constructor

```solidity
constructor() public
```

### mint

```solidity
function mint(address to, uint256 tokenId, uint256 amount) public
```

