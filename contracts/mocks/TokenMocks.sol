// contracts/GLDToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract ERC20Mock is ERC20 {
    string private _tokenName;
    string private _tokenSymbol;
    uint8 private _decimals;

    constructor(string memory _name, string memory sym, uint256 initialSupply, uint8 decimals) ERC20(_name, sym) {
        _tokenName = _name;
        _tokenSymbol = sym;
        _decimals = decimals;
        _mint(msg.sender, initialSupply);
    }

    function mint(address to, uint amount) public {
        _mint(to, amount);
    }
}

contract ERC20Mock_2 is ERC20 {
    constructor() ERC20("ERC20", "20") {
        _mint(msg.sender, 1000 * 10 ** decimals());
    }

    function mint(address to, uint amount) public {
        _mint(to, amount * 10 ** decimals());
    }
}

contract ERC20Mock_3 is ERC20 {
    uint8 private immutable _decimals;

    constructor(uint8 decimals_) ERC20("ERC20", "20") {
        _decimals = decimals_;
        _mint(msg.sender, 1000 * 10 ** decimals_);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint amount) public {
        _mint(to, amount * 10 ** decimals());
    }
}

contract ERC721Mock is ERC721 {
    constructor() ERC721("ERC721", "721") {
        for (uint256 i = 0; i < 10; ) {
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

contract ERC1155Mock is ERC1155 {
    constructor() ERC1155("tbd") {
        for (uint256 i = 0; i < 10; ) {
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
