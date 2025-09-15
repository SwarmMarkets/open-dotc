// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.25;

abstract contract BuyerBurnerWhitelistedTokens {
    error TokenWhitelisted(address token);
    error TokenNotWhitelisted(address token);

    event Whitelisted(TokenInfo tokenInfo);
    event Unwhitelisted(address token);

    struct TokenInfo {
        address token;
        address priceFeed;
        uint256 maxPriceFeedDelay;
    }

    TokenInfo[] public tokens;
    mapping(address token => uint256 index) public indexOf;

    /// @notice Add a single token + its Chainlink feed
    function _addToken(TokenInfo calldata tokenInfo) internal virtual {
        if (indexOf[tokenInfo.token] != 0) {
            revert TokenWhitelisted(tokenInfo.token);
        }

        tokens.push(tokenInfo);
        indexOf[tokenInfo.token] = tokens.length; // 1-based

        emit Whitelisted(tokenInfo);
    }

    /// @notice Remove a single token
    function _removeToken(address token) internal virtual {
        uint256 index = indexOf[token];
        if (index == 0) {
            revert TokenNotWhitelisted(token);
        }

        // swap-and-pop
        uint256 last = tokens.length;
        TokenInfo memory lastTokenInfo = tokens[last - 1];
        tokens[index - 1] = lastTokenInfo;
        indexOf[lastTokenInfo.token] = index;

        tokens.pop();

        delete indexOf[token];

        emit Unwhitelisted(token);
    }

    /// @notice Batch add
    function _addTokens(TokenInfo[] calldata tokensInfos) internal {
        for (uint256 i; i < tokensInfos.length; ++i) {
            _addToken(tokensInfos[i]);
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
