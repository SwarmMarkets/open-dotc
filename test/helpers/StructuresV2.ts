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
	PartialTaking,
	FullyTaking
}

export enum ValidityType {
	NotTaken,
	Cancelled,
	PartiallyTaken,
	FullyTaken
}

export enum EscrowType {
	NoType,
	OfferDeposited,
	OfferFullyWithdrew,
	OfferPartiallyWithdrew,
	OfferCancelled
}

export interface PriceStruct {
	priceFeedAddress: string;
	min: BigNumberish;
	max: BigNumberish;
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
	validityType: ValidityType;
	depositAsset: AssetStruct;
	withdrawalAsset: AssetStruct;
	offer: OfferStruct;
}

export interface EscrowOfferStruct {
	escrowType: EscrowType;
	depositAsset: AssetStruct;
}

