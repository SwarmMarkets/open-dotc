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
	unitPrice: BigNumberish;
	min: BigNumberish;
	max: BigNumberish;
	percentage: BigNumberish;
}

export interface AssetStruct {
	assetType: AssetType;
	assetAddress: string;
	assetPriceFeedAddress: string;
	amount: BigNumberish;
	tokenId: BigNumberish;
}

export interface OfferStruct {
	takingOfferType: TakingOfferType;
	offerPricingType: OfferPricingType;
	price: PriceStruct;
	specialAddresses: string[];
	authorizationAddresses: string[];
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

