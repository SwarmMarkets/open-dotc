// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.28;

import { Asset, AssetType, AssetPrice, OfferStruct, TakingOfferType, OfferPrice } from "../../OpenDotc/v2/structures/DotcStructuresV2.sol";

abstract contract BuyerBurnerOfferMaker {
    event PoolNotExistsOfferMade(
        uint256 offerId,
        address depositToken,
        uint256 amountIn,
        address withdrawalToken,
        uint256 amountOut
    );

    string private constant TERMS = "https://docs.swarmx.net/";
    string private constant COMMS = "help@swarm.com";

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
            amount: amountOut, //TODO: take from getPrice() that relies on AggregatorV2V3Interface,
            tokenId: 0,
            assetPrice: AssetPrice(address(0), 0, 0)
        });

        address[] memory addresses = address[](0);

        OfferStruct memory offer = OfferStruct({
            takingOfferType: TakingOfferType.PartialOffer,
            offerPrice: OfferPrice(OfferPricingType.FixedPricing, 1, 0, PercentageType.NoType), // TODO: change uintPrice if required
            specialAddresses: addresses,
            authorizationAddresses: addresses,
            expiryTimestamp: 0,
            timelockPeriod: 0,
            terms: TERMS,
            commsLink: COMMS
        });

        DotcV2 dotc = DotcV2(_dotc());

        uint256 offerId = dotc.currentOfferId() + 1;

        dotc.makeOffer(depositAsset, withdrawalAsset, offer);

        emit PoolNotExistsOfferMade(offerId, depositToken, amountIn, withdrawalToken, amountOut);
    }

    function _dotc() internal view virtual returns (address);
}
