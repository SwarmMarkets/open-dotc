import { BigNumberish } from 'ethers';

export enum AssetType {
	NoType,
	ERC20,
	ERC721,
	ERC1155,
}

export enum OfferPricingType {
	NoType,
	FixedPricing,
	DynamicPricing
}

export enum TakingOfferType {
	NoType,
	PartialOffer,
	BlockOffer
}

export enum OfferFillType {
	NotTaken,
	Cancelled,
	PartiallyTaken,
	FullyTaken
}

export enum PercentageType {
	NoType,
	Plus,
	Minus
}

export enum EscrowOfferStatusType {
	NoType,
	OfferDeposited,
	OfferFullyWithdrawn,
	OfferPartiallyWithdrawn,
	OfferCancelled
}

export interface AssetPriceStruct {
	priceFeedAddress: string;
	offerMaximumPrice: BigNumberish;
	offerMinimumPrice: BigNumberish;
}

export interface OfferPriceStruct {
	offerPricingType: OfferPricingType;
	unitPrice: BigNumberish;
	percentage: BigNumberish;
	percentageType: PercentageType;
}

export interface AssetStruct {
	assetType: AssetType;
	assetAddress: string;
	amount: BigNumberish;
	tokenId: BigNumberish;
	assetPrice: AssetPriceStruct;
}

export interface OfferStruct {
	takingOfferType: TakingOfferType;
	offerPrice: OfferPriceStruct;
	specialAddresses: string[];
	authorizationAddresses: string[];
	expiryTimestamp: BigNumberish;
	timelockPeriod: BigNumberish;
	terms: string;
	commsLink: string;
}

export interface DotcOfferStruct {
	maker: string;
	offerFillType: OfferFillType;
	depositAsset: AssetStruct;
	withdrawalAsset: AssetStruct;
	offer: OfferStruct;
}

export interface EscrowOfferStruct {
	escrowOfferStatusType: EscrowOfferStatusType;
	depositAsset: AssetStruct;
}

