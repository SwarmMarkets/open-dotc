//SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.25;

import { IDotcCompatiblePriceFeed } from "../OpenDotc/v3/interfaces/IDotcCompatiblePriceFeed.sol";

contract PriceFeedMock {
    function latestAnswer() external view returns (int256) {
        return 777;
    }
}
