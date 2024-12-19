//SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.25;

import { IDotcCompatiblePriceFeed } from "../OpenDotc/v2/interfaces/IDotcCompatiblePriceFeed.sol";

/**
 * @title Gold Kilo Price Feed
 * @notice This interface is implemented for the Gold Kilo price.
 * @dev Specifies the interface for the Gold Kilo price.
 * @author Swarm
 */
contract GoldKiloPriceFeed is IDotcCompatiblePriceFeed {
    /// @notice Represents 1 gold kilo in wei (7 decimals).
    int256 public constant ONE_GOLD_KILO_IN_OUNCES = 321507466;

    /// @notice Address of XAU / USD price feed.
    IDotcCompatiblePriceFeed public goldOzPriceFeed;

    /// @notice Initializes this contract.
    constructor(IDotcCompatiblePriceFeed _goldOzPriceFeed) {
        goldOzPriceFeed = _goldOzPriceFeed;
    }

    /**
     * @notice Reads the current answer from aggregator delegated to.
     *
     * @dev #[deprecated] Use latestRoundData instead. This does not error if no
     * answer has been reached, it will simply return 0. Either wait to point to
     * an already answered Aggregator or use the recommended latestRoundData
     * instead which includes better verification information.
     */
    function latestAnswer() external view returns (int256) {
        return (goldOzPriceFeed.latestAnswer() * ONE_GOLD_KILO_IN_OUNCES) / 1e7;
    }

    /**
     * @notice Reads the last updated height from aggregator delegated to.
     *
     * @dev #[deprecated] Use latestRoundData instead. This does not error if no
     * answer has been reached, it will simply return 0. Either wait to point to
     * an already answered Aggregator or use the recommended latestRoundData
     * instead which includes better verification information.
     */
    function latestTimestamp() external view returns (uint256) {
        return goldOzPriceFeed.latestTimestamp();
    }

    /**
     * @notice get past rounds answers
     * @param roundId the answer number to retrieve the answer for
     *
     * @dev #[deprecated] Use getRoundData instead. This does not error if no
     * answer has been reached, it will simply return 0. Either wait to point to
     * an already answered Aggregator or use the recommended getRoundData
     * instead which includes better verification information.
     */
    function getAnswer(uint256 roundId) external view returns (int256) {
        return (goldOzPriceFeed.getAnswer(roundId) * ONE_GOLD_KILO_IN_OUNCES) / 1e7;
    }

    /**
     * @notice get block timestamp when an answer was last updated
     * @param roundId the answer number to retrieve the updated timestamp for
     *
     * @dev #[deprecated] Use getRoundData instead. This does not error if no
     * answer has been reached, it will simply return 0. Either wait to point to
     * an already answered Aggregator or use the recommended getRoundData
     * instead which includes better verification information.
     */
    function getTimestamp(uint256 roundId) external view returns (uint256) {
        return goldOzPriceFeed.getTimestamp(roundId);
    }

    /**
     * @notice get the latest completed round where the answer was updated. This
     * ID includes the proxy's phase, to make sure round IDs increase even when
     * switching to a newly deployed aggregator.
     *
     * @dev #[deprecated] Use latestRoundData instead. This does not error if no
     * answer has been reached, it will simply return 0. Either wait to point to
     * an already answered Aggregator or use the recommended latestRoundData
     * instead which includes better verification information.
     */
    function latestRound() external view returns (uint256) {
        return goldOzPriceFeed.latestRound();
    }

    /**
     * @notice get data about a round. Consumers are encouraged to check
     * that they're receiving fresh data by inspecting the updatedAt and
     * answeredInRound return values.
     * Note that different underlying implementations of AggregatorV3Interface
     * have slightly different semantics for some of the return values. Consumers
     * should determine what implementations they expect to receive
     * data from and validate that they can properly handle return data from all
     * of them.
     * @param roundId the requested round ID as presented through the proxy, this
     * is made up of the aggregator's round ID with the phase ID encoded in the
     * two highest order bytes
     * @return _roundId is the round ID from the aggregator for which the data was
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
    function getRoundData(
        uint80 roundId
    )
        external
        view
        returns (uint80 _roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        (_roundId, answer, startedAt, updatedAt, answeredInRound) = goldOzPriceFeed.getRoundData(roundId);
        answer = (answer * ONE_GOLD_KILO_IN_OUNCES) / 1e7;
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
        (roundId, answer, startedAt, updatedAt, answeredInRound) = goldOzPriceFeed.latestRoundData();
        answer = (answer * ONE_GOLD_KILO_IN_OUNCES) / 1e7;
    }

    /**
     * @notice represents the number of decimals the aggregator responses represent.
     */
    function decimals() external view returns (uint8) {
        return goldOzPriceFeed.decimals();
    }

    /**
     * @notice returns the description of the aggregator the proxy points to.
     */
    function description() external view returns (string memory) {
        return "XAU Kilo / USD";
    }

    /**
     * @notice the version number representing the type of aggregator the proxy
     * points to.
     */
    function version() external view returns (uint256) {
        return goldOzPriceFeed.version();
    }
}
