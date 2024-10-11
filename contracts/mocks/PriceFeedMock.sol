//SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.25;

import { IDotcCompatiblePriceFeed } from "../OpenDotc/v2/interfaces/IDotcCompatiblePriceFeed.sol";

contract PriceFeedV1Mock {
    int256 value;
    constructor(int256 _value) {
        value = _value;
    }

    function latestAnswer() external view returns (int256) {
        return value;
    }
}

contract PriceFeedV3Mock {
    int256 value;
    constructor(int256 _value) {
        value = _value;
    }

    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        answer = value;
    }

    function decimals() external view returns (uint8) {
        return 8;
    }
}
