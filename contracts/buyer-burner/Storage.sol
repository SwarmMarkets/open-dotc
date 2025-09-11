// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.19;

// TODO: maybe storage make as struct
abstract contract Storage {
    /// @notice The Uniswap V3 pool fee (0.3%).
    uint24 public constant POOL_FEE = 3000;

    /// @notice Address of the WETH9 token.
    address public immutable WETH9;
    /// @notice Address of the SMT token, which is burnable.
    address public immutable SMT;

    /// @notice The Uniswap V3 Factory.
    address public immutable UNISWAP_V3_FACTORY;
    /// @notice The Uniswap V3 Swap Router.
    address public immutable UNISWAP_V3_ROUTER;
    /// @notice The Uniswap V3 Swap Quoter.
    address public immutable UNISWAP_V3_QUOTER;
}
