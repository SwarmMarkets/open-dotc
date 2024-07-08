//SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.25;

import { IDotcCompatiblePriceFeed } from "../OpenDotc/v3/interfaces/IDotcCompatiblePriceFeed.sol";

contract PriceFeedMock {
    int256 value;
    constructor(int256 _value) {
        value = _value;
    }

    function latestAnswer() external view returns (int256) {
        return value;
    }

    function decimals() external view returns (uint8) {
        return 8;
    }
}
