//SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.25;

// Solady
import { MetadataReaderLib } from "solady/src/utils/MetadataReaderLib.sol";
import { FixedPointMathLib } from "solady/src/utils/FixedPointMathLib.sol";
import { Receiver } from "solady/src/accounts/Receiver.sol";
import { SafeTransferLib } from "solady/src/utils/SafeTransferLib.sol";

// OZ:

// OZ Contracts
import { Initializable } from "@openzeppelin-v5/contracts-upgradeable/proxy/utils/Initializable.sol";
import { OwnableUpgradeable } from "@openzeppelin-v5/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { SafeERC20 } from "@openzeppelin-v5/contracts/token/ERC20/utils/SafeERC20.sol";

// OZ Interfaces
import { IERC165 } from "@openzeppelin-v5/contracts/utils/introspection/IERC165.sol";
import { IERC20 } from "@openzeppelin-v5/contracts/token/ERC20/IERC20.sol";
import { IERC721 } from "@openzeppelin-v5/contracts/token/ERC721/IERC721.sol";
import { IERC1155 } from "@openzeppelin-v5/contracts/token/ERC1155/IERC1155.sol";

// Chainlink
import { AggregatorV2V3Interface } from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV2V3Interface.sol";
