// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.25;

import { SafeTransferLib } from "solady/src/utils/SafeTransferLib.sol";

import { DotcV2 } from "../../OpenDotc/v2/DotcV2.sol";
import { Asset, AssetType, AssetPrice, OfferStruct, TakingOfferType, OfferPrice, OfferPricingType, PercentageType } from "../../OpenDotc/v2/structures/DotcStructuresV2.sol";

import { TokenInfo } from "../structures/BuyerBurnerStructures.sol";

abstract contract BuyerBurnerOfferMaker {
    using SafeTransferLib for address;

    event DotcSet(address dotc);
    event PoolNotExistOfferMade(uint256 offerId, address depositToken, uint256 amountIn, address withdrawalToken);

    string private constant TERMS = "https://docs.swarmx.net/";
    string private constant COMMS = "help@swarm.com";

    DotcV2 internal _dotc;

    function _setDotc(address dotc) internal {
        _dotc = DotcV2(payable(dotc));
        emit DotcSet(dotc);
    }

    function _makeOffer(
        TokenInfo memory depositToken,
        uint256 amountIn,
        TokenInfo memory withdrawalToken
    ) internal virtual {
        Asset memory depositAsset = Asset({
            assetType: AssetType.ERC20,
            assetAddress: depositToken.token,
            amount: amountIn,
            tokenId: 0,
            assetPrice: AssetPrice(depositToken.priceFeed, 0, 0)
        });

        Asset memory withdrawalAsset = Asset({
            assetType: AssetType.ERC20,
            assetAddress: withdrawalToken.token,
            amount: 1,
            tokenId: 0,
            assetPrice: AssetPrice(withdrawalToken.priceFeed, 0, 0)
        });

        address[] memory addresses = new address[](0);

        OfferStruct memory offer = OfferStruct({
            takingOfferType: TakingOfferType.PartialOffer,
            offerPrice: OfferPrice(OfferPricingType.DynamicPricing, 0, 0, PercentageType.Plus),
            specialAddresses: addresses,
            authorizationAddresses: addresses,
            expiryTimestamp: block.timestamp + 365 days,
            timelockPeriod: 0,
            terms: TERMS,
            commsLink: COMMS
        });

        DotcV2 dotc = _dotc;

        uint256 offerId = dotc.currentOfferId();

        depositToken.token.safeApprove(address(dotc), amountIn);

        dotc.makeOffer(depositAsset, withdrawalAsset, offer);

        emit PoolNotExistOfferMade(offerId, depositToken.token, amountIn, withdrawalToken.token);
    }

    function _cancelOffer(uint256 offerId) internal {
        _dotc.cancelOffer(offerId);
    }
}
