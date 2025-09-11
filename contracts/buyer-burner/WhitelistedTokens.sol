// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.19;

import { SafeTransferLib } from "solady/src/utils/SafeTransferLib.sol";

abstract contract WhitelistedTokens {
    using SafeTransferLib for address;

    error TokenWhitelisted(address token);
    error TokenNotWhitelisted(address token);

    event Whitelisted(address indexed token);
    event Unwhitelisted(address indexed token);

    address[] public tokens;
    mapping(address token => uint256 index) public indexOf;

    /// @notice Add a single token + its Chainlink feed
    function _addToken(address token) internal {
        require(indexOf[token] == 0, TokenWhitelisted(token));

        tokens.push(token);
        indexOf[token] = tokens.length; // 1-based

        token.safeApproveWithRetry(_toApprove(), type(uint256).max);

        emit Whitelisted(token);
    }

    /// @notice Remove a single token
    function _removeToken(address token) internal {
        uint256 index = indexOf[token];
        require(index != 0, TokenNotWhitelisted(token));

        // swap-and-pop
        uint256 last = tokens.length;
        address lastToken = tokens[last - 1];
        tokens[index - 1] = lastToken;
        indexOf[lastToken] = index;

        tokens.pop();

        delete indexOf[token];

        token.safeApproveWithRetry(_toApprove(), 0);

        emit Unwhitelisted(token);
    }

    /// @notice Batch add
    function _addTokens(address[] memory tokensToAdd) internal {
        for (uint256 i; i < tokensToAdd.length; ++i) {
            _addToken(tokensToAdd[i]);
        }
    }

    /// @notice Batch remove
    function _removeTokens(address[] calldata tokensToRemove) internal {
        for (uint256 i; i < tokensToRemove.length; ++i) {
            _removeToken(tokensToRemove[i]);
        }
    }

    /// @notice Revert if not whitelisted
    function _ensureWhitelisted(address token) internal view {
        require(indexOf[token] != 0, TokenNotWhitelisted(token));
    }

    /// @notice Revert if already whitelisted
    function _ensureNotWhitelisted(address token) internal view {
        require(indexOf[token] == 0, TokenWhitelisted(token));
    }

    function _toApprove() internal view virtual returns (address) {}
}
