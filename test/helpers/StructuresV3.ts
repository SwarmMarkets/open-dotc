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

export enum EscrowCallType {
	NoType,
	Deposit,
	Withdraw,
	WithdrawFees,
	Cancel
}
export enum ValidityType {
	NotTaken,
	PartiallyTaken,
	FullyTaken
}

export enum TimeConstraintType {
	Expired,
	TimelockGreaterThanExpirationTime,
	InTimelock,
	IncorrectTimelock
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
	availableAmount: BigNumberish;
	unitPrice: BigNumberish;
	depositAsset: AssetStruct;
	withdrawalAsset: AssetStruct;
	offer: OfferStruct;
}





