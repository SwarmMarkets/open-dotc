//SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.19;

import "@openzeppelin-v4/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin-v4/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "@openzeppelin-v4/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "@openzeppelin-v4/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";

import "@openzeppelin-v4/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin-v4/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "@openzeppelin-v4/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin-v4/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
