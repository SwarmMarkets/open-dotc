// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.25;

import { DotcV2 } from "../../OpenDotc/v2/DotcV2.sol";
import { Asset, AssetType, AssetPrice, OfferStruct, TakingOfferType, OfferPrice, OfferPricingType, PercentageType } from "../../OpenDotc/v2/structures/DotcStructuresV2.sol";

abstract contract BuyerBurnerOfferMaker {
    event DotcSet(DotcV2 dotc);
    event PoolNotExistsOfferMade(
        uint256 offerId,
        address depositToken,
        uint256 amountIn,
        address withdrawalToken,
        uint256 amountOut
    );

    string private constant TERMS = "https://docs.swarmx.net/";
    string private constant COMMS = "help@swarm.com";

    DotcV2 internal _dotc;

    function _setDotc(DotcV2 dotc) internal {
        _dotc = dotc;
        emit DotcSet(dotc);
    }

    function _makeOffer(
        address depositToken,
        uint256 amountIn,
        address withdrawalToken,
        uint256 amountOut
    ) internal virtual {
        Asset memory depositAsset = Asset({
            assetType: AssetType.ERC20,
            assetAddress: depositToken,
            amount: amountIn,
            tokenId: 0,
            assetPrice: AssetPrice(address(0), 0, 0)
        });

        Asset memory withdrawalAsset = Asset({
            assetType: AssetType.ERC20,
            assetAddress: withdrawalToken,
            amount: amountOut,
            tokenId: 0,
            assetPrice: AssetPrice(address(0), 0, 0)
        });

        address[] memory addresses = new address[](0);

        OfferStruct memory offer = OfferStruct({
            takingOfferType: TakingOfferType.PartialOffer,
            offerPrice: OfferPrice(OfferPricingType.FixedPricing, 0, 0, PercentageType.NoType),
            specialAddresses: addresses,
            authorizationAddresses: addresses,
            expiryTimestamp: 0,
            timelockPeriod: 0,
            terms: TERMS,
            commsLink: COMMS
        });

        DotcV2 dotc = _dotc;

        uint256 offerId = dotc.currentOfferId() + 1;

        dotc.makeOffer(depositAsset, withdrawalAsset, offer);

        // TODO: BE should check this event
        emit PoolNotExistsOfferMade(offerId, depositToken, amountIn, withdrawalToken, amountOut);
    }
}
