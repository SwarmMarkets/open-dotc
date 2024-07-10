// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin-v5/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin-v5/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin-v5/contracts/token/ERC1155/ERC1155.sol";

contract ERC20MockV2 is ERC20 {
    uint8 private immutable _decimals;
    constructor(uint8 decimals_) ERC20("ERC20", "20") {
        _decimals = decimals_;
        _mint(msg.sender, 10000000 * 10 ** decimals_);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint amount) public {
        _mint(to, amount * 10 ** decimals());
    }
}

contract ERC721MockV2 is ERC721 {
    constructor() ERC721("ERC721", "721") {
        for (uint256 i = 0; i < 100; ) {
            _mint(msg.sender, i);
            unchecked {
                ++i;
            }
        }
    }

    function mint(address to, uint tokenId) public {
        _mint(to, tokenId);
    }
}

contract ERC1155MockV2 is ERC1155 {
    constructor() ERC1155("tbd") {
        for (uint256 i = 0; i < 100; ) {
            _mint(msg.sender, i, 1000, "");
            unchecked {
                ++i;
            }
        }
    }

    function mint(address to, uint tokenId, uint amount) public {
        _mint(to, tokenId, amount, "");
    }
}
