//SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.25;

import { IDotcManager } from "../OpenDotc/v1/interfaces/IDotcManager.sol";

contract DotcFalseMock {
    /**
     * @notice Changes the manager of the escrow contract.
     * @param _manager The new manager's address.
     * @return status True if the operation was successful.
     * @dev Ensures that only the current manager can perform this operation.
     */
    function changeManager(IDotcManager _manager) external returns (bool status) {
        return false;
    }

    /**
     * @notice Checks if the contract supports a specific interface.
     * @param interfaceId The interface identifier to check.
     * @return True if the interface is supported.
     * @dev Overridden to support AccessControl and ERC1155Receiver interfaces.
     */
    function supportsInterface(bytes4 interfaceId) public view returns (bool) {
        return false;
    }
}

contract DotcTrueMock {
    /**
     * @notice Changes the manager of the escrow contract.
     * @param _manager The new manager's address.
     * @return status True if the operation was successful.
     * @dev Ensures that only the current manager can perform this operation.
     */
    function changeManager(IDotcManager _manager) external returns (bool status) {
        return true;
    }

    /**
     * @notice Checks if the contract supports a specific interface.
     * @param interfaceId The interface identifier to check.
     * @return True if the interface is supported.
     * @dev Overridden to support AccessControl and ERC1155Receiver interfaces.
     */
    function supportsInterface(bytes4 interfaceId) public view returns (bool) {
        return true;
    }
}
