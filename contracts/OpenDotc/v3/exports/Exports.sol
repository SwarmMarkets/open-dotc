//SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.25;

import { IERC165 } from "@openzeppelin-v5/contracts/utils/introspection/IERC165.sol";

import { Ownable } from "@openzeppelin-v5/contracts/access/Ownable.sol";
import { OwnableUpgradeable } from "@openzeppelin-v5/contracts-upgradeable/access/OwnableUpgradeable.sol";

import { ERC1155Holder } from "@openzeppelin-v5/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import { ERC721Holder } from "@openzeppelin-v5/contracts/token/ERC721/utils/ERC721Holder.sol";
import { ERC1155HolderUpgradeable } from "@openzeppelin-v5/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import { ERC721HolderUpgradeable } from "@openzeppelin-v5/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";

import { SafeERC20 } from "@openzeppelin-v5/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC20, IERC20Metadata } from "@openzeppelin-v5/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { IERC721 } from "@openzeppelin-v5/contracts/token/ERC721/IERC721.sol";
import { IERC1155 } from "@openzeppelin-v5/contracts/token/ERC1155/IERC1155.sol";
