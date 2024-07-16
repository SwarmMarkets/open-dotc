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

export enum EscrowOfferStatusType {
	NoType,
	OfferDeposited,
	OfferFullyWithdrawn,
	OfferPartiallyWithdrawn,
	OfferCancelled
}

export interface PriceStruct {
	priceFeedAddress: string;
	offerMaximumPrice: BigNumberish;
	offerMinimumPrice: BigNumberish;
	percentage: BigNumberish;
}

export interface AssetStruct {
	assetType: AssetType;
	assetAddress: string;
	amount: BigNumberish;
	tokenId: BigNumberish;
	price: PriceStruct;
}

export interface OfferStruct {
	takingOfferType: TakingOfferType;
	offerPricingType: OfferPricingType;
	specialAddresses: string[];
	authorizationAddresses: string[];
	unitPrice: BigNumberish;
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

