//SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.28;

import { Ownable } from "solady/src/auth/Ownable.sol";

/**
 * @title Gold Ounce Price Feed
 * @notice This interface is implemented for the Gold Kilo price.
 * @dev Specifies the interface for the Gold Kilo price.
 * @author Swarm
 */
contract GoldOuncePriceFeed is Ownable {
    event LatestAnswerUpdated(int256 latestAnswer, uint256 latestTimestamp);

    error IncorrectOffchainTimestampTooOld(uint256 timestamp);

    uint8 public decimals;
    string public description;
    uint256 public version;

    int256 public latestAnswer;
    uint256 public latestTimestamp;

    uint256 private _latestOffchainTimestamp;

    /// @notice Initializes this contract.
    constructor(uint8 _decimals, string memory _description, uint256 _version) {
        decimals = _decimals;
        description = _description;
        version = _version;

        _initializeOwner(msg.sender);
    }

    function setLatestAnswer(int256 answer, uint256 offChaintimestamp) public onlyOwner {
        require(
            offChaintimestamp > _latestOffchainTimestamp && offChaintimestamp <= block.timestamp + 60,
            IncorrectOffchainTimestampTooOld(offChaintimestamp)
        );

        _latestOffchainTimestamp = offChaintimestamp;

        latestAnswer = answer;
        latestTimestamp = block.timestamp;

        emit LatestAnswerUpdated(answer, block.timestamp);
    }

    /**
     * @notice get data about the latest round. Consumers are encouraged to check
     * that they're receiving fresh data by inspecting the updatedAt and
     * answeredInRound return values.
     * Note that different underlying implementations of AggregatorV3Interface
     * have slightly different semantics for some of the return values. Consumers
     * should determine what implementations they expect to receive
     * data from and validate that they can properly handle return data from all
     * of them.
     * @return roundId is the round ID from the aggregator for which the data was
     * retrieved combined with an phase to ensure that round IDs get larger as
     * time moves forward.
     * @return answer is the answer for the given round
     * @return startedAt is the timestamp when the round was started.
     * (Only some AggregatorV3Interface implementations return meaningful values)
     * @return updatedAt is the timestamp when the round last was updated (i.e.
     * answer was last computed)
     * @return answeredInRound is the round ID of the round in which the answer
     * was computed.
     * (Only some AggregatorV3Interface implementations return meaningful values)
     * @dev Note that answer and updatedAt may change between queries.
     */
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (0, latestAnswer, latestTimestamp, latestTimestamp, 0);
    }
}
