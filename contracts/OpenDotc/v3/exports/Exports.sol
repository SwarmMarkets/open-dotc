//SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.25;

import { IERC165 } from "@openzeppelin-v5/contracts/utils/introspection/IERC165.sol";

import "@openzeppelin-v5/contracts-upgradeable/access/OwnableUpgradeable.sol";

import { ERC1155HolderUpgradeable } from "@openzeppelin-v5/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "@openzeppelin-v5/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";

import "@openzeppelin-v5/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin-v5/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { IERC721 } from "@openzeppelin-v5/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin-v5/contracts/token/ERC1155/IERC1155.sol";
