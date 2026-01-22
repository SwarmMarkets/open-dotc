// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.25;

import { SafeTransferLib } from "solady/src/utils/SafeTransferLib.sol";

import { ITokenTransferor } from "../interfaces/ITokenTransferor.sol";

abstract contract BuyerBurnerCCIPCaller {
    using SafeTransferLib for address;

    event CCIPConfigSet(CCIPConfig config);
    event CCIPTransferSubmitted(bytes32 messageId, address token, uint256 amount);

    struct CCIPConfig {
        uint64 destinationChainSelector;
        ITokenTransferor bridge;
        address receiver;
    }

    CCIPConfig internal _ccipConfig;

    function _setCCIPConfig(CCIPConfig calldata ccipConfig) internal {
        _ccipConfig = ccipConfig;
        emit CCIPConfigSet(ccipConfig);
    }

    function _ccipTransfer(address token, uint256 amount) internal virtual {
        CCIPConfig memory config = _ccipConfig;
        uint256 fees = config.bridge.estimateFees(config.destinationChainSelector, config.receiver, token, amount);
        token.safeApproveWithRetry(address(config.bridge), amount);
        bytes32 messageId = config.bridge.bridgeTokens{ value: fees }(
            config.destinationChainSelector,
            config.receiver,
            token,
            amount
        );

        if (fees < msg.value) {
            SafeTransferLib.safeTransferETH(msg.sender, msg.value - fees);
        }
        emit CCIPTransferSubmitted(messageId, token, amount);
    }
}
