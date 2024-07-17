import { ethers } from 'hardhat';
import { BigNumber } from 'ethers';
import { DotcV2 } from 'typechain';
import { TakingOfferType, OfferPricingType, OfferStruct, AssetType, PriceStruct, AssetStruct } from '../test/helpers/StructuresV2';

const DotcV2: string = '0x1558c15E513E1d99eF9e653bcd5d6F996C1B2F0d';

const AuthTrue: string = '0xd57642925a5E287F90b04CE74bFC1218B41Cd4b8',
	AuthFalse: string = '0x357A28B3a543bcEB9a2C1Ba795F07D23cD1F1f68';

const PriceFeed_USDC: string = '0xE8317935Afe9126668Ff3e306B1BeAAf1693254F',
	PriceFeed_ETH: string = '0x43B525fDD277C9c56bb7E8B4206890DEe306F290',
	PriceFeed_Gold: string = '0xc0047fB798af785112204502F4220b4601926899';

const ERC20_6: string = '0xa144F12d9d121474129bba63B6DCEe28CbAf0856',
	ERC20_18: string = '0x0c39589605DC00922e3762588961DE39eAfA4395',
	ERC721: string = '0x447F13e8c3a710D64bC6268534C47344F45373f7',
	ERC1155: string = '0xF998e4b2057371CE7f526C2FF359Ad549EbBDdD9';

const Taker: string = '0x811AE8434b584dfde82C14102820570611d47A59';

const time = 1721141948;

async function main() {
	await demonstrateDynamicPricingAgainstERC1155();
}

async function demonstrateAuth() {
	const dotcV2 = await ethers.getContractAt('DotcV2', DotcV2) as DotcV2;
	const erc20_6 = await ethers.getContractAt('ERC20MockV2', ERC20_6);
	const erc20_18 = await ethers.getContractAt('ERC20MockV2', ERC20_18);

	const amountIn = ethers.utils.parseUnits('43', 6);
	const amountOut = ethers.utils.parseUnits('104', 18);

	await erc20_6.approve(DotcV2, amountIn);
	await erc20_18.transfer(Taker, amountOut);

	const DepositPrice: PriceStruct = {
		priceFeedAddress: PriceFeed_USDC,
		offerMaximumPrice: 0,
		offerMinimumPrice: 0,
		percentage: 0
	}

	const WithdrawalPrice: PriceStruct = {
		priceFeedAddress: PriceFeed_ETH,
		offerMaximumPrice: 0,
		offerMinimumPrice: 0,
		percentage: 0
	}

	const DepositAsset: AssetStruct = {
		assetType: 1,
		assetAddress: ERC20_6,
		price: DepositPrice,
		amount: amountIn,
		tokenId: 0,
	};

	const WithdrawalAsset: AssetStruct = {
		assetType: 1,
		assetAddress: ERC20_18,
		price: WithdrawalPrice,
		amount: amountOut,
		tokenId: 0,
	};

	const Offer: OfferStruct = {
		takingOfferType: TakingOfferType.BlockOffer,
		offerPricingType: OfferPricingType.FixedPricing,
		unitPrice: 0,
		specialAddresses: [],
		authorizationAddresses: [AuthFalse],
		expiryTimestamp: time + 20000,
		timelockPeriod: 0,
		terms: "tbd",
		commsLink: "tbd",
	};

	await dotcV2.makeOffer(DepositAsset, WithdrawalAsset, Offer);
}

async function demonstrateAffiliate() {
	const [maker] = await ethers.getSigners();
	const dotcV2 = await ethers.getContractAt('DotcV2', DotcV2) as DotcV2;
	const erc20_6 = await ethers.getContractAt('ERC20MockV2', ERC20_6);
	const erc721 = await ethers.getContractAt('ERC721MockV2', ERC721);

	const withdrawalTokenId = 5;
	const amountIn_asset = ethers.utils.parseUnits('43', 6);

	await erc20_6.approve(DotcV2, amountIn_asset);
	await erc721['safeTransferFrom(address,address,uint256)'](maker.address, Taker, withdrawalTokenId);

	const DepositPrice: PriceStruct = {
		priceFeedAddress: PriceFeed_USDC,
		offerMaximumPrice: 0, // OfferMaximumPrice
		offerMinimumPrice: 0, // OfferMinimumPrice
		percentage: 0
	}

	const WithdrawalPrice: PriceStruct = {
		priceFeedAddress: PriceFeed_Gold,
		offerMaximumPrice: 0,
		offerMinimumPrice: 0,
		percentage: 0
	}

	const DepositAsset: AssetStruct = {
		assetType: 1,
		assetAddress: ERC20_6,
		price: DepositPrice,
		amount: amountIn_asset,
		tokenId: 0,
	};

	const WithdrawalAsset: AssetStruct = {
		assetType: 2,
		assetAddress: ERC721,
		price: WithdrawalPrice,
		amount: 1,
		tokenId: 4,
	};

	const Offer: OfferStruct = {
		takingOfferType: TakingOfferType.BlockOffer,
		offerPricingType: OfferPricingType.FixedPricing,
		unitPrice: 0,
		specialAddresses: [],
		authorizationAddresses: [],
		expiryTimestamp: time + 20000,
		timelockPeriod: 0,
		terms: "tbd",
		commsLink: "tbd",
	};

	await dotcV2.makeOffer(DepositAsset, WithdrawalAsset, Offer);
}

async function demonstrateDynamicPricingAgainstERC20() {
	const dotcV2 = await ethers.getContractAt('DotcV2', DotcV2) as DotcV2;
	const erc20_6 = await ethers.getContractAt('ERC20MockV2', ERC20_6);
	const erc20_18 = await ethers.getContractAt('ERC20MockV2', ERC20_18);

	const amountIn = ethers.utils.parseEther('5');
	const amountOut = ethers.utils.parseUnits('15000', 6);

	await erc20_18.approve(DotcV2, amountIn);
	await erc20_6.transfer(Taker, amountOut.mul(2));

	const PriceDeposit: PriceStruct = {
		priceFeedAddress: PriceFeed_ETH,
		offerMaximumPrice: 0,
		offerMinimumPrice: 314097411980,
		percentage: 100
	}

	const PriceWithdrawal: PriceStruct = {
		priceFeedAddress: PriceFeed_USDC,
		offerMaximumPrice: 0,
		offerMinimumPrice: 100000000,
		percentage: 100
	}

	const DepositAsset: AssetStruct = {
		assetType: AssetType.ERC20,
		assetAddress: erc20_18.address,
		price: PriceDeposit,
		amount: amountIn,
		tokenId: 0,
	};

	const WithdrawalAsset: AssetStruct = {
		assetType: AssetType.ERC20,
		assetAddress: erc20_6.address,
		price: PriceWithdrawal,
		amount: amountOut,
		tokenId: 0,
	};

	const Offer: OfferStruct = {
		takingOfferType: TakingOfferType.BlockOffer,
		offerPricingType: OfferPricingType.DynamicPricing,
		unitPrice: 0,
		specialAddresses: [],
		authorizationAddresses: [],
		expiryTimestamp: time + 20000,
		timelockPeriod: 0,
		terms: 'tbd',
		commsLink: 'tbd',
	};

	await dotcV2.makeOffer(DepositAsset, WithdrawalAsset, Offer);
}

async function demonstrateDynamicPricingAgainstERC1155() {
	const [maker] = await ethers.getSigners();

	const dotcV2 = await ethers.getContractAt('DotcV2', DotcV2) as DotcV2;
	const erc20_6 = await ethers.getContractAt('ERC20MockV2', ERC20_6);
	const erc1155 = await ethers.getContractAt('ERC1155MockV2', ERC1155);

	const amountOut = 100;
	const tokenOutId = 3;
	const amountIn = BigNumber.from(15000).mul(BigNumber.from(10).pow(await erc20_6.decimals()));

	// await erc20_6.approve(DotcV2, amountIn);
	await erc1155.safeTransferFrom(maker.address, Taker, tokenOutId, amountOut, '0x00');

	const PriceDeposit: PriceStruct = {
		priceFeedAddress: PriceFeed_USDC,
		offerMaximumPrice: 0,
		offerMinimumPrice: 100000000,
		percentage: 100
	}

	const PriceWithdrawal: PriceStruct = {
		priceFeedAddress: PriceFeed_Gold,
		offerMaximumPrice: 0,
		offerMinimumPrice: 240000000000,
		percentage: 100
	}

	const DepositAsset: AssetStruct = {
		assetType: AssetType.ERC20,
		assetAddress: erc20_6.address,
		price: PriceDeposit,
		amount: amountIn,
		tokenId: 0,
	};

	const WithdrawalAsset: AssetStruct = {
		assetType: AssetType.ERC1155,
		assetAddress: erc1155.address,
		price: PriceWithdrawal,
		amount: amountOut,
		tokenId: tokenOutId,
	};

	const Offer: OfferStruct = {
		takingOfferType: TakingOfferType.BlockOffer,
		offerPricingType: OfferPricingType.DynamicPricing,
		unitPrice: 0,
		specialAddresses: [],
		authorizationAddresses: [],
		expiryTimestamp: time + 20000,
		timelockPeriod: 0,
		terms: 'tbd',
		commsLink: 'tbd',
	};

	await dotcV2.makeOffer(DepositAsset, WithdrawalAsset, Offer);
}

main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});
