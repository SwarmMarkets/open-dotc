//SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.25;

import { Asset } from "../OpenDotc/v2/structures/DotcStructuresV2.sol";
import { IDotcManager } from "../OpenDotc/v2/interfaces/IDotcManager.sol";

contract EscrowFalseMock {
    /**
     * @notice Sets the initial deposit for a maker's offer.
     * @param offerId The ID of the offer being deposited.
     * @param maker The address of the maker making the deposit.
     * @param asset The asset being deposited.
     * @return True if the operation was successful.
     * @dev Only callable by DOTC contract, ensures the asset is correctly deposited.
     */
    function setDeposit(uint offerId, address maker, Asset calldata asset) external returns (bool) {
        return false;
    }

    /**
     * @notice Withdraws a deposit from escrow to the taker's address.
     * @param offerId The ID of the offer being withdrawn.
     * @param amountToWithdraw Amount of the asset to withdraw.
     * @param taker The address receiving the withdrawn assets.
     * @return True if the operation was successful.
     * @dev Ensures that the withdrawal is valid and transfers the asset to the taker.
     */
    function withdrawDeposit(uint256 offerId, uint256 amountToWithdraw, address taker) external returns (bool) {
        return false;
    }

    /**
     * @notice Cancels a deposit in escrow, returning it to the maker.
     * @param offerId The ID of the offer being cancelled.
     * @param maker The address of the maker to return the assets to.
     * @return status True if the operation was successful.
     * @return amountToCancel Amount of the asset returned to the maker.
     * @dev Only callable by DOTC contract, ensures the asset is returned to the maker.
     */
    function cancelDeposit(uint256 offerId, address maker) external returns (bool status, uint256 amountToCancel) {
        amountToCancel = 0;

        status = false;
    }

    /**
     * @notice Withdraws fee amount from escrow.
     * @param offerId The ID of the offer related to the fees.
     * @param amountToWithdraw The amount of fees to withdraw.
     * @return status True if the operation was successful.
     * @dev Ensures that the fee withdrawal is valid and transfers the fee to the designated receiver.
     */
    function withdrawFees(uint256 offerId, uint256 amountToWithdraw) external returns (bool status) {
        return false;
    }

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
