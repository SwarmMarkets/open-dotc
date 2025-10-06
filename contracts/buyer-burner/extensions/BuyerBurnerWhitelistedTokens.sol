// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.25;

import { TokenInfo } from "../structures/BuyerBurnerStructures.sol";

abstract contract BuyerBurnerWhitelistedTokens {
    error TokenWhitelisted(address token);
    error TokenNotWhitelisted(address token);

    event Whitelisted(TokenInfo tokenInfo);
    event Unwhitelisted(address token);

    TokenInfo[] internal _tokens;
    mapping(address token => uint256 index) internal _indexOfToken;

    /// @notice Add a single token + its Chainlink feed
    function _addToken(TokenInfo calldata tokenInfo) internal virtual {
        if (_indexOfToken[tokenInfo.token] != 0) {
            revert TokenWhitelisted(tokenInfo.token);
        }

        _tokens.push(tokenInfo);
        _indexOfToken[tokenInfo.token] = _tokens.length; // 1-based

        emit Whitelisted(tokenInfo);
    }

    /// @notice Remove a single token
    function _removeToken(address token) internal virtual {
        uint256 index = _indexOfToken[token];
        if (index == 0) {
            revert TokenNotWhitelisted(token);
        }

        // swap-and-pop
        uint256 last = _tokens.length;
        TokenInfo memory lastTokenInfo = _tokens[last - 1];
        _tokens[index - 1] = lastTokenInfo;
        _indexOfToken[lastTokenInfo.token] = index;

        _tokens.pop();

        delete _indexOfToken[token];

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
}
