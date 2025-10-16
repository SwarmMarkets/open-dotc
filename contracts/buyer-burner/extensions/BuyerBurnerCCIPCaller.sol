// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.25;

import { SafeTransferLib } from "solady/src/utils/SafeTransferLib.sol";

import { ITokenTransferor } from "../interfaces/ITokenTransferor.sol";

abstract contract BuyerBurnerCCIPCaller {
    event CcipConfigSet(CCIPConfig config);
    event CCIPTransferSubmited(bytes32 messageId, address token, uint256 amount);

    struct CCIPConfig {
        uint64 destinationChainSelector;
        ITokenTransferor bridge;
        address receiver;
    }

    CCIPConfig internal _ccipConfig;

    function _setCCIPConfig(CCIPConfig calldata ccipConfig) internal {
        _ccipConfig = ccipConfig;
        emit CcipConfigSet(ccipConfig);
    }

    function _ccipTransfer(address token, uint256 amount) internal virtual {
        uint256 fees = _ccipConfig.bridge.estimateFees(
            _ccipConfig.destinationChainSelector,
            _ccipConfig.receiver,
            token,
            amount
        );
        bytes32 messageId = _ccipConfig.bridge.bridgeTokens{ value: fees }(
            _ccipConfig.destinationChainSelector,
            _ccipConfig.receiver,
            token,
            amount
        );

        if (fees < msg.value) {
            SafeTransferLib.safeTransferETH(msg.sender, msg.value - fees);
        }
        emit CCIPTransferSubmited(messageId, token, amount);
    }
}
