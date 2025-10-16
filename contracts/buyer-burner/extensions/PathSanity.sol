// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.25;

library PathSanity {
    error BadPath();
    error InvalidHopSameToken();
    error ZeroToken();
    error AddrOOB();
    error FeeOOB();

    uint256 internal constant ADDR_LEN = 20;
    uint256 internal constant FEE_LEN = 3;
    uint256 internal constant HOP_LEN = 23;

    /// @dev Path: token(20) | fee(3) | token(20) | [fee(3) | token(20)]...
    /// Ensures structure is valid and no adjacent tokens are equal/zero.
    function validateNoAdjacentEqualTokens(bytes memory path) internal pure {
        uint256 len = path.length;
        // Must be 20 + k*(3+20), k>=1  => min = 43 bytes
        if (!(len >= (ADDR_LEN + HOP_LEN) && (len - ADDR_LEN) % HOP_LEN == 0)) {
            revert BadPath();
        }

        address prev = _addrAt(path, 0);
        if (prev == address(0)) revert ZeroToken();

        // next token starts after 20 (addr) + 3 (fee)
        uint256 i = HOP_LEN;

        while (i + ADDR_LEN <= len) {
            address next_ = _addrAt(path, i);
            if (next_ == address(0)) revert ZeroToken();
            if (prev == next_) revert InvalidHopSameToken();
            prev = next_;
            i += HOP_LEN;
        }
    }

    /// @dev Read an address from `path` at byte offset `index`.
    function _addrAt(bytes memory path, uint256 index) private pure returns (address a) {
        if (path.length < index + ADDR_LEN) revert AddrOOB();
        assembly {
            a := shr(96, mload(add(add(path, 0x20), index)))
        }
    }

    /// @dev Read a uint24 fee from `path` at byte offset `index`.
    function feeAt(bytes memory path, uint256 index) internal pure returns (uint24 f) {
        if (path.length < index + FEE_LEN) revert FeeOOB();
        assembly {
            f := shr(232, mload(add(add(path, 0x20), index)))
        }
    }
}
