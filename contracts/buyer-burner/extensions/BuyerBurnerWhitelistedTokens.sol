// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.25;

abstract contract BuyerBurnerWhitelistedTokens {
    error TokenWhitelisted(address token);
    error TokenNotWhitelisted(address token);

    event Whitelisted(address indexed token);
    event Unwhitelisted(address indexed token);

    address[] public tokens;
    mapping(address token => uint256 index) public indexOf;

    /// @notice Add a single token + its Chainlink feed
    function _addToken(address token) internal virtual {
        if (indexOf[token] != 0) {
            revert TokenWhitelisted(token);
        }

        tokens.push(token);
        indexOf[token] = tokens.length; // 1-based

        emit Whitelisted(token);
    }

    /// @notice Remove a single token
    function _removeToken(address token) internal virtual {
        uint256 index = indexOf[token];
        if (index == 0) {
            revert TokenNotWhitelisted(token);
        }

        // swap-and-pop
        uint256 last = tokens.length;
        address lastToken = tokens[last - 1];
        tokens[index - 1] = lastToken;
        indexOf[lastToken] = index;

        tokens.pop();

        delete indexOf[token];

        emit Unwhitelisted(token);
    }

    /// @notice Batch add
    function _addTokens(address[] calldata tokensToAdd) internal {
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
    function _ensureWhitelisted(address token) internal view virtual {
        if (indexOf[token] == 0) {
            revert TokenNotWhitelisted(token);
        }
    }

    /// @notice Revert if already whitelisted
    function _ensureNotWhitelisted(address token) internal view virtual {
        if (indexOf[token] != 0) {
            revert TokenWhitelisted(token);
        }
    }
}
