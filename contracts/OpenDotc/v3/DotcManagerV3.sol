//SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.25;

import { OwnableUpgradeable } from "./exports/ExternalExports.sol";

import { AssetHelper } from "./helpers/AssetHelper.sol";
import { DotcV3 } from "./DotcV3.sol";
import { DotcEscrowV3 } from "./DotcEscrowV3.sol";

import { OnlyDotc, ZeroAddressPassed, IncorrectPercentage } from "./structures/DotcStructuresV3.sol";

/**
 * @title TODO (as part of the "SwarmX.eth Protocol")
 * @notice TODO
 * ////////////////DISCLAIMER////////////////DISCLAIMER////////////////DISCLAIMER////////////////
 * Please read the Disclaimer featured on the SwarmX.eth website ("Terms") carefully before accessing,
 * interacting with, or using the SwarmX.eth Protocol software, consisting of the SwarmX.eth Protocol
 * technology stack (in particular its smart contracts) as well as any other SwarmX.eth technology such
 * as e.g., the launch kit for frontend operators (together the "SwarmX.eth Protocol Software").
 * By using any part of the SwarmX.eth Protocol you agree (1) to the Terms and acknowledge that you are
 * aware of the existing risk and knowingly accept it, (2) that you have read, understood and accept the
 * legal information and terms of service and privacy note presented in the Terms, and (3) that you are
 * neither a US person nor a person subject to international sanctions (in particular as imposed by the
 * European Union, Switzerland, the United Nations, as well as the USA). If you do not meet these
 * requirements, please refrain from using the SwarmX.eth Protocol.
 * ////////////////DISCLAIMER////////////////DISCLAIMER////////////////DISCLAIMER////////////////
 * @dev TODO
 * @author Swarm
 */
contract DotcManagerV3 is OwnableUpgradeable {
    /**
     * @dev Emitted when the dotc address is changed.
     * @param by Address of the user who changed the dotc address.
     * @param dotc New dotc's address.
     */
    event DotcAddressSet(address indexed by, DotcV3 dotc);
    /**
     * @dev Emitted when the escrow address is changed.
     * @param by Address of the user who changed the escrow address.
     * @param escrow New escrow's address.
     */
    event EscrowAddressSet(address indexed by, DotcEscrowV3 escrow);

    /**
     * @dev
     * @param by Address of the user who performed the update.
     */
    event FeesReceiverSet(address indexed by, address feeReceiver);
    event FeesAmountSet(address indexed by, uint256 feeAmount);
    /**
     * @dev
     * @param by Address of the user who performed the update.
     * @param revShareAmount  TODO
     */
    event RevShareSet(address indexed by, uint256 revShareAmount);

    /**
     * @dev Address of the dotc contract.
     */
    DotcV3 public dotc;

    DotcEscrowV3 public escrow;

    // Fees
    address public feeReceiver;
    uint256 public feeAmount;

    uint256 public revSharePercentage;

    /**
     * @notice Ensures that the function is only callable by the DOTC contract.
     * @dev Modifier that restricts function access to the address of the DOTC contract.
     */
    modifier onlyDotc() {
        if (msg.sender != address(dotc)) {
            revert OnlyDotc();
        }
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the escrow contract with a fees parameters.
     * @dev Sets up the contract to handle ERC1155 and ERC721 tokens.
     * @param _newFeeReceiver The address of the fee receiver.
     */
    function initialize(address _newFeeReceiver) public initializer {
        __Ownable_init(msg.sender);

        feeReceiver = _newFeeReceiver;
        feeAmount = 25 * (10 ** 23);

        revSharePercentage = 8000;
    }

    /**
     * @notice Changes the dotc in the escrow contract.
     * @param _dotc The new dotc's address.
     * @dev Ensures that only the current owner can perform this operation.
     */
    function changeDotc(DotcV3 _dotc) external onlyOwner {
        if (address(_dotc) == address(0)) {
            revert ZeroAddressPassed();
        }

        dotc = _dotc;

        emit DotcAddressSet(msg.sender, _dotc);
    }

    /**
     * @notice Changes the escrow address.
     * @param _escrow The new escrow's address.
     * @dev Ensures that only the current owner can perform this operation.
     */
    function changeEscrow(DotcEscrowV3 _escrow) external onlyOwner {
        if (address(_escrow) == address(0)) {
            revert ZeroAddressPassed();
        }

        escrow = _escrow;

        emit EscrowAddressSet(msg.sender, _escrow);
    }

    /**
     * @notice Changes the escrow address in the Dotc contract.
     * @dev Ensures that only the current owner can perform this operation.
     */
    function changeDotcInEscrow() external onlyOwner {
        escrow.changeDotc(dotc);
    }

    /**
     * @notice Changes the escrow address in the Dotc contract.
     * @dev Ensures that only the current owner can perform this operation.
     */
    function changeEscrowInDotc() external onlyOwner {
        dotc.changeEscrow(escrow);
    }

    /**
     * @notice
     * @param _newFeeReceiver The new fee receiver address.
     * @param _feeAmount The new fee amount.
     * @param _revShare The new fee amount.
     * @dev Requires caller to be the owner of the contract.
     */
    function changeFees(address _newFeeReceiver, uint256 _feeAmount, uint256 _revShare) external onlyOwner {
        if (_newFeeReceiver != address(0)) {
            feeReceiver = _newFeeReceiver;
            emit FeesReceiverSet(msg.sender, _newFeeReceiver);
        }

        if (_feeAmount != 0) {
            feeAmount = _feeAmount;
            emit FeesAmountSet(msg.sender, _feeAmount);
        }

        if (_revShare > 0) {
            if (_revShare > AssetHelper.SCALING_FACTOR) {
                revert IncorrectPercentage(_revShare);
            }

            revSharePercentage = _revShare;
            emit RevShareSet(msg.sender, _revShare);
        }
    }
}
