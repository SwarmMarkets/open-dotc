import { BigNumberish } from "ethers";

export interface DotcOfferV2Struct {
	maker: string;
	isFullyTaken: boolean;
	availableAmount: BigNumberish;
	unitPrice: BigNumberish;
	depositAsset: AssetStruct;
	withdrawalAsset: AssetStruct;
	offer: OfferStruct;
}

export interface DotcOfferV1Struct {
	maker: string;
	isFullType: boolean;
	isFullyTaken: boolean;
	depositAsset: AssetStruct;
	withdrawalAsset: AssetStruct;
	availableAmount: BigNumberish;
	unitPrice: BigNumberish;
	specialAddress: string;
	expiryTime: BigNumberish;
	timelockPeriod: BigNumberish;
}

export interface OfferStruct {
	isFullType: boolean;
	specialAddresses: string[];
	expiryTimestamp: BigNumberish;
	timelockPeriod: BigNumberish;
	terms: string;
	commsLink: string;
}

export interface AssetStruct {
	assetType: AssetType;
	assetAddress: string;
	amount: BigNumberish;
	tokenId: BigNumberish;
}

export enum AssetType {
	NoType,
	ERC20,
	ERC721,
	ERC1155
}

export enum EscrowCallType {
	Deposit,
	Withdraw,
	WithdrawFees,
	Cancel
}