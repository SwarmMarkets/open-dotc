//SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.25;

import { IDotcCompatibleAuthorization } from "../OpenDotc/v2/interfaces/IDotcCompatibleAuthorization.sol";

contract AuthorizationMock {
    bool private _value;

    constructor(bool value) {
        _value = value;
    }

    function isAccountAuthorized(address _account) external view returns (bool) {
        return _value;
    }
}
