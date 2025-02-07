import { ethers, upgrades } from 'hardhat';
import { BigNumber, ContractFactory, Signer } from 'ethers';
import { expect } from 'chai';
import {
  DotcEscrowV2,
  DotcV2 as DotcV2,
  ERC20MockV2,
  ERC721MockV2,
  ERC1155MockV2,
  AssetHelper,
  DotcOfferHelper,
  OfferHelper,
  DotcManagerV2,
  AuthorizationMock,
  PriceFeedV1Mock,
  PriceFeedV3Mock,
} from '../../../typechain';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import {
  AssetStruct,
  DotcOfferStruct,
  AssetPriceStruct,
  OfferPriceStruct,
  OfferStruct,
  AssetType,
  EscrowOfferStatusType,
  TakingOfferType,
  OfferFillType,
  OfferPricingType,
  PercentageType,
} from '../../helpers/StructuresV2';

const WAD = ethers.utils.parseUnits('1', 27);
const SCALING_FACTOR = 10000;

describe('OpenDotcV2', () => {
  const addressZero = ethers.constants.AddressZero;
  const terms = 'terms';
  const commsLink = 'commsLink';

  let decimals_18: number, decimals_6: number, priceFeed_decimals: number;

  const usdc_price: number = 99999257;
  const eth_price: number = 304097411980;
  const gold_price: number = 236069005000;

  let now: number;

  let AssetPrice: AssetPriceStruct, OfferPrice: OfferPriceStruct;

  async function fixture() {
    const [deployer, acc1, acc2, acc3, otherAcc]: Signer[] = await ethers.getSigners();

    // Deploy AssetHelper library
    const AssetHelper: ContractFactory = await ethers.getContractFactory('AssetHelper');
    const assetHelper = (await AssetHelper.deploy()) as AssetHelper;
    await assetHelper.deployed();

    // Deploy DotcOfferHelper library
    const OfferHelper: ContractFactory = await ethers.getContractFactory('OfferHelper', {
      libraries: {
        AssetHelper: assetHelper.address,
      },
    });
    const offerHelper = (await OfferHelper.deploy()) as OfferHelper;
    await offerHelper.deployed();

    // Deploy DotcOfferHelper library
    const DotcOfferHelper: ContractFactory = await ethers.getContractFactory('DotcOfferHelper');
    const dotcOfferHelper = (await DotcOfferHelper.deploy()) as DotcOfferHelper;
    await dotcOfferHelper.deployed();

    const DotcManager: ContractFactory = await ethers.getContractFactory('DotcManagerV2');
    const dotcManager = (await upgrades.deployProxy(DotcManager, [await deployer.getAddress()])) as DotcManagerV2;
    await dotcManager.deployed();

    const DotcEscrow: ContractFactory = await ethers.getContractFactory('DotcEscrowV2');
    const escrow = (await upgrades.deployProxy(DotcEscrow, [dotcManager.address], {
      unsafeAllowLinkedLibraries: true,
    })) as DotcEscrowV2;
    await escrow.deployed();

    const Dotc = await ethers.getContractFactory('DotcV2', {
      libraries: {
        AssetHelper: assetHelper.address,
        OfferHelper: offerHelper.address,
        DotcOfferHelper: dotcOfferHelper.address,
      },
    });
    const dotc = (await upgrades.deployProxy(Dotc, [dotcManager.address], {
      unsafeAllowLinkedLibraries: true,
    })) as DotcV2;
    await dotc.deployed();

    const ERC20: ContractFactory = await ethers.getContractFactory('ERC20MockV2');
    const erc20_18: ERC20MockV2 = (await ERC20.deploy(18)) as ERC20MockV2;
    await erc20_18.deployed();
    const erc20_6: ERC20MockV2 = (await ERC20.deploy(6)) as ERC20MockV2;
    await erc20_6.deployed();

    const ERC721: ContractFactory = await ethers.getContractFactory('ERC721MockV2');
    const erc721: ERC721MockV2 = (await ERC721.deploy()) as ERC721MockV2;
    await erc721.deployed();

    const ERC1155: ContractFactory = await ethers.getContractFactory('ERC1155MockV2');
    const erc1155: ERC1155MockV2 = (await ERC1155.deploy()) as ERC1155MockV2;
    await erc1155.deployed();

    const AuthorizationMock: ContractFactory = await ethers.getContractFactory('AuthorizationMock');
    const authorization_true: AuthorizationMock = (await AuthorizationMock.deploy(true)) as AuthorizationMock;
    await authorization_true.deployed();
    const authorization_false: AuthorizationMock = (await AuthorizationMock.deploy(false)) as AuthorizationMock;
    await authorization_false.deployed();

    const PriceFeedV1Mock: ContractFactory = await ethers.getContractFactory('PriceFeedV1Mock');
    const PriceFeedV3Mock: ContractFactory = await ethers.getContractFactory('PriceFeedV3Mock');
    const priceFeed_18: PriceFeedV1Mock = (await PriceFeedV1Mock.deploy(eth_price)) as PriceFeedV1Mock;
    await priceFeed_18.deployed();
    const priceFeed_6: PriceFeedV3Mock = (await PriceFeedV3Mock.deploy(usdc_price)) as PriceFeedV3Mock;
    await priceFeed_6.deployed();
    const priceFeed_1155: PriceFeedV3Mock = (await PriceFeedV3Mock.deploy(gold_price)) as PriceFeedV3Mock;
    await priceFeed_1155.deployed();
    const priceFeed_fake: PriceFeedV1Mock = (await PriceFeedV1Mock.deploy(-1)) as PriceFeedV1Mock;
    await priceFeed_fake.deployed();

    await dotcManager.changeEscrow(escrow.address);
    await dotcManager.changeDotc(dotc.address);
    await dotcManager.changeDotcInEscrow();
    await dotcManager.changeEscrowInDotc();

    decimals_18 = await erc20_18.decimals();
    decimals_6 = await erc20_6.decimals();
    priceFeed_decimals = 8;
    now = await time.latest();

    const priceFeed_721 = priceFeed_1155;

    AssetPrice = {
      priceFeedAddress: priceFeed_fake.address,
      offerMaximumPrice: 0,
      offerMinimumPrice: 0,
    };

    OfferPrice = {
      offerPricingType: OfferPricingType.FixedPricing,
      unitPrice: 0,
      percentage: 100,
      percentageType: PercentageType.NoType,
    };

    return {
      deployer,
      acc1,
      acc2,
      acc3,
      otherAcc,
      dotc,
      escrow,
      dotcManager,
      assetHelper,
      offerHelper,
      dotcOfferHelper,
      erc20_18,
      erc20_6,
      erc721,
      erc1155,
      authorization_false,
      authorization_true,
      priceFeed_18,
      priceFeed_6,
      priceFeed_1155,
      priceFeed_721,
      priceFeed_fake,
    };
  }

  describe('Deployment', () => {
    it('Should be proper addresses', async () => {
      const { dotc, escrow } = await loadFixture(fixture);

      expect(dotc.address).to.be.properAddress;
      expect(escrow.address).to.be.properAddress;
    });

    it('Should be initialized', async () => {
      const { dotc, escrow } = await loadFixture(fixture);

      await expect(escrow.initialize(dotc.address)).to.be.revertedWithCustomError(escrow, 'InvalidInitialization');
      await expect(dotc.initialize(escrow.address)).to.be.revertedWithCustomError(dotc, 'InvalidInitialization');
    });
  });

  describe('Errors', () => {
    it('Only Manager can change Escrow', async () => {
      const { dotc, escrow } = await loadFixture(fixture);

      await expect(dotc.changeEscrow(escrow.address)).to.be.revertedWithCustomError(dotc, 'OnlyManager');
    });
  });

  describe('Make offer', () => {
    describe('Fixed assetPrice', () => {
      it('Should make full offer (erc20 => erc20)', async () => {
        const {
          dotc,
          escrow,
          offerHelper,
          assetHelper,
          erc20_18,
          erc20_6,
          erc721,
          authorization_false,
          authorization_true,
          acc1,
          acc2,
          acc3,
          deployer,
        } = await loadFixture(fixture);

        let offerId = 0;

        const amountIn = 43;
        const amountOut = 104;

        const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));
        const amountOut_asset = BigNumber.from(amountOut).mul(BigNumber.from(10).pow(decimals_6));

        await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
        await erc20_6.transfer(await acc2.getAddress(), amountOut_asset);

        await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
        await erc20_6.connect(acc2).approve(dotc.address, amountOut_asset);

        const DepositAssetERC20: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_18.address,
          assetPrice: AssetPrice,
          amount: amountIn_asset,
          tokenId: 0,
        };

        const WithdrawalAssetERC20: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_6.address,
          assetPrice: AssetPrice,
          amount: amountOut_asset,
          tokenId: 0,
        };

        const unitPrice = BigNumber.from(WithdrawalAssetERC20.amount)
          .mul(WAD)
          .div(BigNumber.from(DepositAssetERC20.amount));

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.BlockOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc1.getAddress(),
          offerFillType: OfferFillType.NotTaken,
          depositAsset: DepositAssetERC20,
          withdrawalAsset: WithdrawalAssetERC20,
          offer: Offer,
        };

        const make_offer = await dotc
          .connect(acc1)
          .makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

        await expect(make_offer).to.emit(dotc, 'CreatedOffer');
        await expect(make_offer)
          .to.emit(escrow, 'OfferDeposited')
          .withArgs(offerId, await acc1.getAddress(), DepositAssetERC20.amount);

        expect(await dotc.currentOfferId()).to.be.eq(offerId + 1);
        expect(await erc20_18.balanceOf(escrow.address)).to.eq(amountIn_asset);

        expect(await dotc.offersFromAddress(await acc1.getAddress(), offerId)).to.eq(0);

        expect((await dotc.allOffers(0)).offer.takingOfferType).to.eq(AwaitingOffer.offer.takingOfferType);
        expect((await dotc.allOffers(0)).maker).to.eq(AwaitingOffer.maker);
        expect((await dotc.allOffers(0)).offerFillType).to.eq(AwaitingOffer.offerFillType);
        expect((await dotc.allOffers(0)).offer.offerPrice.unitPrice).to.eq(unitPrice);
        expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq(AwaitingOffer.offer.specialAddresses);
        expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(AwaitingOffer.offer.expiryTimestamp);
        expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(AwaitingOffer.offer.timelockPeriod);
        expect((await dotc.allOffers(0)).offer.terms).to.eq(AwaitingOffer.offer.terms);
        expect((await dotc.allOffers(0)).offer.commsLink).to.eq(AwaitingOffer.offer.commsLink);

        expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(DepositAssetERC20.amount);
        expect((await escrow.escrowDeposits(offerId)).depositAsset.assetAddress).to.be.eq(
          DepositAssetERC20.assetAddress,
        );
        expect((await escrow.escrowDeposits(offerId)).depositAsset.assetType).to.be.eq(DepositAssetERC20.assetType);
        expect((await escrow.escrowDeposits(offerId)).depositAsset.tokenId).to.be.eq(DepositAssetERC20.tokenId);

        expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
          EscrowOfferStatusType.OfferDeposited,
        );

        expect(await dotc.offersFromAddress(await acc1.getAddress(), 0)).to.eq(0);
        expect((await dotc.allOffers(0)).maker).to.eq(await acc1.getAddress());

        offerId++;

        Offer.expiryTimestamp = now + 20000;
        Offer.timelockPeriod = now + 20001;

        await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20, Offer)).to.be.revertedWithCustomError(
          offerHelper,
          'IncorrectTimelockPeriodError',
        );

        Offer.expiryTimestamp = now + 1;
        Offer.timelockPeriod = now;

        await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20, Offer)).to.be.revertedWithCustomError(
          offerHelper,
          'OfferExpiredTimestampError',
        );

        Offer.expiryTimestamp = now + 20000;
        Offer.timelockPeriod = now;

        await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20, Offer)).to.be.revertedWithCustomError(
          offerHelper,
          'IncorrectTimelockPeriodError',
        );

        const WithdrawalAssetERC721_false: AssetStruct = {
          assetType: 2,
          assetAddress: erc721.address,
          assetPrice: AssetPrice,
          amount: 1,
          tokenId: 4,
        };

        Offer.takingOfferType = TakingOfferType.PartialOffer;
        Offer.timelockPeriod = 0;

        await erc20_18.approve(dotc.address, ethers.utils.parseEther('1000000'));

        await expect(
          dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC721_false, Offer),
        ).to.be.revertedWithCustomError(offerHelper, 'UnsupportedPartialOfferForNonERC20AssetsError');

        await expect(
          dotc.makeOffer(WithdrawalAssetERC721_false, DepositAssetERC20, Offer),
        ).to.be.revertedWithCustomError(offerHelper, 'UnsupportedPartialOfferForNonERC20AssetsError');

        let DepositAssetERC20_false: AssetStruct = {
          assetType: 0,
          assetAddress: erc20_18.address,
          assetPrice: AssetPrice,
          amount: amountIn_asset,
          tokenId: 0,
        };

        Offer.takingOfferType = TakingOfferType.BlockOffer;

        await expect(
          dotc.makeOffer(DepositAssetERC20_false, WithdrawalAssetERC20, Offer),
        ).to.be.revertedWithCustomError(assetHelper, 'AssetTypeUndefinedError');

        DepositAssetERC20_false = {
          assetType: 1,
          assetAddress: addressZero,
          assetPrice: AssetPrice,
          amount: amountIn_asset,
          tokenId: 0,
        };

        await expect(
          dotc.makeOffer(DepositAssetERC20_false, WithdrawalAssetERC20, Offer),
        ).to.be.revertedWithCustomError(assetHelper, 'AssetAddressIsZeroError');

        DepositAssetERC20_false = {
          assetType: 1,
          assetAddress: erc20_18.address,
          assetPrice: AssetPrice,
          amount: 0,
          tokenId: 0,
        };

        await expect(
          dotc.makeOffer(DepositAssetERC20_false, WithdrawalAssetERC20, Offer),
        ).to.be.revertedWithCustomError(assetHelper, 'AssetAmountIsZeroError');

        let WithdrawalAssetERC20_false: AssetStruct = {
          assetType: 0,
          assetAddress: erc20_6.address,
          assetPrice: AssetPrice,
          amount: amountOut_asset,
          tokenId: 0,
        };

        await expect(
          dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20_false, Offer),
        ).to.be.revertedWithCustomError(assetHelper, 'AssetTypeUndefinedError');

        WithdrawalAssetERC20_false = {
          assetType: 1,
          assetAddress: addressZero,
          assetPrice: AssetPrice,
          amount: amountOut_asset,
          tokenId: 0,
        };

        await expect(
          dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20_false, Offer),
        ).to.be.revertedWithCustomError(assetHelper, 'AssetAddressIsZeroError');

        WithdrawalAssetERC20_false = {
          assetType: 1,
          assetAddress: erc20_6.address,
          assetPrice: AssetPrice,
          amount: 0,
          tokenId: 0,
        };

        await expect(
          dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20_false, Offer),
        ).to.be.revertedWithCustomError(assetHelper, 'AssetAmountIsZeroError');

        Offer.specialAddresses = [addressZero];
        await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20, Offer)).to.be.revertedWithCustomError(
          offerHelper,
          'AddressIsZeroError',
        );
        Offer.specialAddresses = [await acc1.getAddress(), addressZero, await acc2.getAddress()];
        await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20, Offer)).to.be.revertedWithCustomError(
          offerHelper,
          'AddressIsZeroError',
        );

        Offer.specialAddresses = [];

        Offer.authorizationAddresses = [addressZero];
        await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20, Offer)).to.be.revertedWithCustomError(
          offerHelper,
          'AddressIsZeroError',
        );
        Offer.authorizationAddresses = [await acc1.getAddress(), addressZero, await acc2.getAddress()];
        await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20, Offer)).to.be.revertedWithCustomError(
          offerHelper,
          'AddressIsZeroError',
        );
        Offer.authorizationAddresses = [];

        Offer.authorizationAddresses = [authorization_false.address];
        await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20, Offer))
          .to.be.revertedWithCustomError(offerHelper, 'NotAuthorizedAccountError')
          .withArgs(await deployer.getAddress());
        Offer.authorizationAddresses = [authorization_true.address];

        Offer.takingOfferType = TakingOfferType.NoType;
        await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20, Offer)).to.be.revertedWithCustomError(
          offerHelper,
          'TypesShouldBeSpecified',
        );
        Offer.takingOfferType = TakingOfferType.BlockOffer;

        Offer.offerPrice.offerPricingType = OfferPricingType.NoType;
        await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20, Offer)).to.be.revertedWithCustomError(
          offerHelper,
          'TypesShouldBeSpecified',
        );
        Offer.offerPrice.offerPricingType = OfferPricingType.FixedPricing;

        WithdrawalAssetERC20.assetPrice.offerMaximumPrice = 1;
        await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20, Offer))
          .to.be.revertedWithCustomError(assetHelper, 'PriceShouldNotBeSpecifiedFor')
          .withArgs(Offer.offerPrice.offerPricingType);
        WithdrawalAssetERC20.assetPrice.offerMaximumPrice = 0;

        DepositAssetERC20.assetPrice.offerMinimumPrice = 1;
        await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20, Offer))
          .to.be.revertedWithCustomError(assetHelper, 'PriceShouldNotBeSpecifiedFor')
          .withArgs(Offer.offerPrice.offerPricingType);
        DepositAssetERC20.assetPrice.offerMinimumPrice = 0;

        await expect(dotc.connect(acc3).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, Offer))
          .to.be.revertedWithCustomError(assetHelper, 'AddressHaveNoERC20')
          .withArgs(await acc3.getAddress(), DepositAssetERC20.assetAddress, 0, DepositAssetERC20.amount);

        DepositAssetERC20.assetType = 5;
        await expect(dotc.connect(acc3).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, Offer)).to.be.reverted;
      });

      it('Should make partial offer (erc20 => erc20)', async () => {
        const { dotc, escrow, erc20_18, erc20_6, acc1, acc2 } = await loadFixture(fixture);

        const offerId = 0;

        const amountIn = 43;
        const amountOut = 104;

        const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));
        const amountOut_asset = BigNumber.from(amountOut).mul(BigNumber.from(10).pow(decimals_6));

        await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
        await erc20_6.transfer(await acc2.getAddress(), amountOut_asset);

        await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
        await erc20_6.connect(acc2).approve(dotc.address, amountOut_asset);

        const DepositAssetERC20: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_18.address,
          assetPrice: AssetPrice,
          amount: amountIn_asset,
          tokenId: 0,
        };

        const WithdrawalAssetERC20: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_6.address,
          assetPrice: AssetPrice,
          amount: amountOut_asset,
          tokenId: 0,
        };

        const DepositAssetERC20_standardized: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_18.address,
          assetPrice: AssetPrice,
          amount: standardizeNumber(amountIn_asset, decimals_18),
          tokenId: 0,
        };

        const WithdrawalAssetERC20_standardized: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_6.address,
          assetPrice: AssetPrice,
          amount: standardizeNumber(amountOut_asset, decimals_6),
          tokenId: 0,
        };

        const unitPrice = BigNumber.from(WithdrawalAssetERC20_standardized.amount)
          .mul(WAD)
          .div(BigNumber.from(DepositAssetERC20_standardized.amount));

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.PartialOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc1.getAddress(),
          offerFillType: OfferFillType.NotTaken,
          depositAsset: DepositAssetERC20_standardized,
          withdrawalAsset: WithdrawalAssetERC20_standardized,
          offer: Offer,
        };

        const make_offer = await dotc
          .connect(acc1)
          .makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

        await expect(make_offer).to.emit(dotc, 'CreatedOffer');
        await expect(make_offer)
          .to.emit(escrow, 'OfferDeposited')
          .withArgs(offerId, await acc1.getAddress(), DepositAssetERC20.amount);

        expect(await dotc.currentOfferId()).to.be.eq(offerId + 1);
        expect(await erc20_18.balanceOf(escrow.address)).to.eq(amountIn_asset);

        expect(await dotc.offersFromAddress(await acc1.getAddress(), offerId)).to.eq(0);

        expect((await dotc.allOffers(0)).offer.takingOfferType).to.eq(AwaitingOffer.offer.takingOfferType);
        expect((await dotc.allOffers(0)).maker).to.eq(AwaitingOffer.maker);
        expect((await dotc.allOffers(0)).offerFillType).to.eq(AwaitingOffer.offerFillType);

        expect((await dotc.allOffers(0)).offer.offerPrice.unitPrice).to.eq(unitPrice);
        expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq(AwaitingOffer.offer.specialAddresses);
        expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(AwaitingOffer.offer.expiryTimestamp);
        expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(AwaitingOffer.offer.timelockPeriod);
        expect((await dotc.allOffers(0)).offer.terms).to.eq(AwaitingOffer.offer.terms);
        expect((await dotc.allOffers(0)).offer.commsLink).to.eq(AwaitingOffer.offer.commsLink);

        expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(DepositAssetERC20.amount);
        expect((await escrow.escrowDeposits(offerId)).depositAsset.assetAddress).to.be.eq(
          DepositAssetERC20.assetAddress,
        );
        expect((await escrow.escrowDeposits(offerId)).depositAsset.assetType).to.be.eq(DepositAssetERC20.assetType);
        expect((await escrow.escrowDeposits(offerId)).depositAsset.tokenId).to.be.eq(DepositAssetERC20.tokenId);

        expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
          EscrowOfferStatusType.OfferDeposited,
        );
      });

      it('Should make full offer (erc20 => erc721)', async () => {
        const { dotc, escrow, erc20_18, erc721, acc1, acc2, deployer } = await loadFixture(fixture);

        const offerId = 0;

        const amountIn = 43;

        const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));

        await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
        await erc721['safeTransferFrom(address,address,uint256)'](
          await deployer.getAddress(),
          await acc2.getAddress(),
          4,
        );

        await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
        await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

        const DepositAssetERC20: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_18.address,
          assetPrice: AssetPrice,
          amount: amountIn_asset,
          tokenId: 0,
        };

        const WithdrawalAssetERC721: AssetStruct = {
          assetType: 2,
          assetAddress: erc721.address,
          assetPrice: AssetPrice,
          amount: 1,
          tokenId: 4,
        };

        const unitPrice = BigNumber.from(WithdrawalAssetERC721.amount)
          .mul(WAD)
          .div(BigNumber.from(DepositAssetERC20.amount));

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.BlockOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc1.getAddress(),
          offerFillType: OfferFillType.NotTaken,
          depositAsset: DepositAssetERC20,
          withdrawalAsset: WithdrawalAssetERC721,
          offer: Offer,
        };

        const make_offer = await dotc
          .connect(acc1)
          .makeOffer(DepositAssetERC20, WithdrawalAssetERC721, AwaitingOffer.offer);

        await expect(make_offer).to.emit(dotc, 'CreatedOffer');
        await expect(make_offer)
          .to.emit(escrow, 'OfferDeposited')
          .withArgs(offerId, await acc1.getAddress(), DepositAssetERC20.amount);

        expect(await dotc.currentOfferId()).to.be.eq(offerId + 1);
        expect(await erc20_18.balanceOf(escrow.address)).to.eq(amountIn_asset);

        expect(await dotc.offersFromAddress(await acc1.getAddress(), offerId)).to.eq(0);

        expect((await dotc.allOffers(0)).offer.takingOfferType).to.eq(AwaitingOffer.offer.takingOfferType);
        expect((await dotc.allOffers(0)).maker).to.eq(AwaitingOffer.maker);
        expect((await dotc.allOffers(0)).offerFillType).to.eq(AwaitingOffer.offerFillType);
        expect((await dotc.allOffers(0)).offer.offerPrice.unitPrice).to.eq(unitPrice);
        expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq(AwaitingOffer.offer.specialAddresses);
        expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(AwaitingOffer.offer.expiryTimestamp);
        expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(AwaitingOffer.offer.timelockPeriod);
        expect((await dotc.allOffers(0)).offer.terms).to.eq(AwaitingOffer.offer.terms);
        expect((await dotc.allOffers(0)).offer.commsLink).to.eq(AwaitingOffer.offer.commsLink);

        expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(DepositAssetERC20.amount);
        expect((await escrow.escrowDeposits(offerId)).depositAsset.assetAddress).to.be.eq(
          DepositAssetERC20.assetAddress,
        );
        expect((await escrow.escrowDeposits(offerId)).depositAsset.assetType).to.be.eq(DepositAssetERC20.assetType);
        expect((await escrow.escrowDeposits(offerId)).depositAsset.tokenId).to.be.eq(DepositAssetERC20.tokenId);

        expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
          EscrowOfferStatusType.OfferDeposited,
        );
      });

      it('Should make full offer (erc721 => erc20)', async () => {
        const { dotc, escrow, assetHelper, erc20_18, erc721, erc1155, acc1, acc2, acc3, deployer } = await loadFixture(
          fixture,
        );

        const offerId = 0;

        const amountIn = 43;

        const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));

        await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
        await erc721['safeTransferFrom(address,address,uint256)'](
          await deployer.getAddress(),
          await acc2.getAddress(),
          4,
        );

        await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
        await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

        const DepositAssetERC20: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_18.address,
          assetPrice: AssetPrice,
          amount: amountIn_asset,
          tokenId: 0,
        };

        const WithdrawalAssetERC721: AssetStruct = {
          assetType: 2,
          assetAddress: erc721.address,
          assetPrice: AssetPrice,
          amount: 1,
          tokenId: 4,
        };

        const unitPrice = BigNumber.from(DepositAssetERC20.amount)
          .mul(WAD)
          .div(BigNumber.from(WithdrawalAssetERC721.amount));

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.BlockOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc2.getAddress(),
          offerFillType: OfferFillType.NotTaken,
          depositAsset: WithdrawalAssetERC721,
          withdrawalAsset: DepositAssetERC20,
          offer: Offer,
        };

        const make_offer = await dotc
          .connect(acc2)
          .makeOffer(WithdrawalAssetERC721, DepositAssetERC20, AwaitingOffer.offer);

        await expect(make_offer).to.emit(dotc, 'CreatedOffer');
        await expect(make_offer)
          .to.emit(escrow, 'OfferDeposited')
          .withArgs(offerId, await acc2.getAddress(), WithdrawalAssetERC721.amount);

        expect(await dotc.currentOfferId()).to.be.eq(offerId + 1);
        expect(await erc721.ownerOf(WithdrawalAssetERC721.tokenId)).to.eq(escrow.address);

        expect(await dotc.offersFromAddress(await acc2.getAddress(), offerId)).to.eq(0);

        expect((await dotc.allOffers(0)).offer.takingOfferType).to.eq(AwaitingOffer.offer.takingOfferType);
        expect((await dotc.allOffers(0)).maker).to.eq(AwaitingOffer.maker);
        expect((await dotc.allOffers(0)).offerFillType).to.eq(AwaitingOffer.offerFillType);
        expect((await dotc.allOffers(0)).offer.offerPrice.unitPrice).to.eq(unitPrice);
        expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq(AwaitingOffer.offer.specialAddresses);
        expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(AwaitingOffer.offer.expiryTimestamp);
        expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(AwaitingOffer.offer.timelockPeriod);
        expect((await dotc.allOffers(0)).offer.terms).to.eq(AwaitingOffer.offer.terms);
        expect((await dotc.allOffers(0)).offer.commsLink).to.eq(AwaitingOffer.offer.commsLink);

        expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(WithdrawalAssetERC721.amount);
        expect((await escrow.escrowDeposits(offerId)).depositAsset.assetAddress).to.be.eq(
          WithdrawalAssetERC721.assetAddress,
        );
        expect((await escrow.escrowDeposits(offerId)).depositAsset.assetType).to.be.eq(WithdrawalAssetERC721.assetType);
        expect((await escrow.escrowDeposits(offerId)).depositAsset.tokenId).to.be.eq(WithdrawalAssetERC721.tokenId);

        expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
          EscrowOfferStatusType.OfferDeposited,
        );

        await expect(dotc.connect(acc3).makeOffer(WithdrawalAssetERC721, DepositAssetERC20, Offer))
          .to.be.revertedWithCustomError(assetHelper, 'AddressHaveNoERC721')
          .withArgs(await acc3.getAddress(), WithdrawalAssetERC721.assetAddress, WithdrawalAssetERC721.tokenId);

        WithdrawalAssetERC721.assetAddress = erc1155.address;
        await expect(dotc.connect(acc3).makeOffer(WithdrawalAssetERC721, DepositAssetERC20, Offer))
          .to.be.revertedWithCustomError(assetHelper, 'IncorrectAssetTypeForAddress')
          .withArgs(WithdrawalAssetERC721.assetAddress, WithdrawalAssetERC721.assetType);
      });

      it('Should make full offer (erc20 => erc1155)', async () => {
        const { dotc, escrow, erc20_18, erc1155, acc1, acc2, deployer } = await loadFixture(fixture);

        const offerId = 0;

        const amountIn = 43;

        const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));

        await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
        await erc1155.safeTransferFrom(await deployer.getAddress(), await acc2.getAddress(), 3, 202, '0x00');

        await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
        await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

        const DepositAssetERC20: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_18.address,
          assetPrice: AssetPrice,
          amount: amountIn_asset,
          tokenId: 0,
        };

        const WithdrawalAssetERC1155: AssetStruct = {
          assetType: 3,
          assetAddress: erc1155.address,
          assetPrice: AssetPrice,
          amount: 202,
          tokenId: 3,
        };

        const unitPrice = BigNumber.from(WithdrawalAssetERC1155.amount)
          .mul(WAD)
          .div(BigNumber.from(DepositAssetERC20.amount));

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.BlockOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc1.getAddress(),
          offerFillType: OfferFillType.NotTaken,
          depositAsset: DepositAssetERC20,
          withdrawalAsset: WithdrawalAssetERC1155,
          offer: Offer,
        };

        const make_offer = await dotc
          .connect(acc1)
          .makeOffer(DepositAssetERC20, WithdrawalAssetERC1155, AwaitingOffer.offer);

        await expect(make_offer).to.emit(dotc, 'CreatedOffer');
        await expect(make_offer)
          .to.emit(escrow, 'OfferDeposited')
          .withArgs(offerId, await acc1.getAddress(), DepositAssetERC20.amount);

        expect(await dotc.currentOfferId()).to.be.eq(offerId + 1);
        expect(await erc20_18.balanceOf(escrow.address)).to.eq(amountIn_asset);

        expect(await dotc.offersFromAddress(await acc1.getAddress(), offerId)).to.eq(0);

        expect((await dotc.allOffers(0)).offer.takingOfferType).to.eq(AwaitingOffer.offer.takingOfferType);
        expect((await dotc.allOffers(0)).maker).to.eq(AwaitingOffer.maker);
        expect((await dotc.allOffers(0)).offerFillType).to.eq(AwaitingOffer.offerFillType);
        expect((await dotc.allOffers(0)).offer.offerPrice.unitPrice).to.eq(unitPrice);
        expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq(AwaitingOffer.offer.specialAddresses);
        expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(AwaitingOffer.offer.expiryTimestamp);
        expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(AwaitingOffer.offer.timelockPeriod);
        expect((await dotc.allOffers(0)).offer.terms).to.eq(AwaitingOffer.offer.terms);
        expect((await dotc.allOffers(0)).offer.commsLink).to.eq(AwaitingOffer.offer.commsLink);

        expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(DepositAssetERC20.amount);
        expect((await escrow.escrowDeposits(offerId)).depositAsset.assetAddress).to.be.eq(
          DepositAssetERC20.assetAddress,
        );
        expect((await escrow.escrowDeposits(offerId)).depositAsset.assetType).to.be.eq(DepositAssetERC20.assetType);
        expect((await escrow.escrowDeposits(offerId)).depositAsset.tokenId).to.be.eq(DepositAssetERC20.tokenId);

        expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
          EscrowOfferStatusType.OfferDeposited,
        );
      });

      it('Should make full offer (erc1155 => erc20)', async () => {
        const { dotc, escrow, assetHelper, erc20_18, erc1155, erc721, acc1, acc2, acc3, deployer } = await loadFixture(
          fixture,
        );

        const offerId = 0;

        const amountIn = 43;

        const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));

        await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
        await erc1155.safeTransferFrom(await deployer.getAddress(), await acc2.getAddress(), 3, 202, '0x00');

        await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
        await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

        const DepositAssetERC20: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_18.address,
          assetPrice: AssetPrice,
          amount: amountIn_asset,
          tokenId: 0,
        };

        const WithdrawalAssetERC1155: AssetStruct = {
          assetType: 3,
          assetAddress: erc1155.address,
          assetPrice: AssetPrice,
          amount: 202,
          tokenId: 3,
        };

        const unitPrice = BigNumber.from(DepositAssetERC20.amount)
          .mul(WAD)
          .div(BigNumber.from(WithdrawalAssetERC1155.amount));

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.BlockOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc2.getAddress(),
          offerFillType: OfferFillType.NotTaken,
          depositAsset: WithdrawalAssetERC1155,
          withdrawalAsset: DepositAssetERC20,
          offer: Offer,
        };

        const make_offer = await dotc
          .connect(acc2)
          .makeOffer(WithdrawalAssetERC1155, DepositAssetERC20, AwaitingOffer.offer);

        await expect(make_offer).to.emit(dotc, 'CreatedOffer');
        await expect(make_offer)
          .to.emit(escrow, 'OfferDeposited')
          .withArgs(offerId, await acc2.getAddress(), WithdrawalAssetERC1155.amount);

        expect(await dotc.currentOfferId()).to.be.eq(offerId + 1);
        expect(await erc1155.balanceOf(escrow.address, WithdrawalAssetERC1155.tokenId)).to.eq(
          WithdrawalAssetERC1155.amount,
        );

        expect(await dotc.offersFromAddress(await acc2.getAddress(), offerId)).to.eq(0);

        expect((await dotc.allOffers(0)).offer.takingOfferType).to.eq(AwaitingOffer.offer.takingOfferType);
        expect((await dotc.allOffers(0)).maker).to.eq(AwaitingOffer.maker);
        expect((await dotc.allOffers(0)).offerFillType).to.eq(AwaitingOffer.offerFillType);
        expect((await dotc.allOffers(0)).offer.offerPrice.unitPrice).to.eq(unitPrice);
        expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq(AwaitingOffer.offer.specialAddresses);
        expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(AwaitingOffer.offer.expiryTimestamp);
        expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(AwaitingOffer.offer.timelockPeriod);
        expect((await dotc.allOffers(0)).offer.terms).to.eq(AwaitingOffer.offer.terms);
        expect((await dotc.allOffers(0)).offer.commsLink).to.eq(AwaitingOffer.offer.commsLink);

        expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(WithdrawalAssetERC1155.amount);
        expect((await escrow.escrowDeposits(offerId)).depositAsset.assetAddress).to.be.eq(
          WithdrawalAssetERC1155.assetAddress,
        );
        expect((await escrow.escrowDeposits(offerId)).depositAsset.assetType).to.be.eq(
          WithdrawalAssetERC1155.assetType,
        );
        expect((await escrow.escrowDeposits(offerId)).depositAsset.tokenId).to.be.eq(WithdrawalAssetERC1155.tokenId);

        expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
          EscrowOfferStatusType.OfferDeposited,
        );

        await expect(dotc.connect(acc3).makeOffer(WithdrawalAssetERC1155, DepositAssetERC20, Offer))
          .to.be.revertedWithCustomError(assetHelper, 'AddressHaveNoERC1155')
          .withArgs(
            await acc3.getAddress(),
            WithdrawalAssetERC1155.assetAddress,
            WithdrawalAssetERC1155.tokenId,
            0,
            WithdrawalAssetERC1155.amount,
          );

        WithdrawalAssetERC1155.assetAddress = erc721.address;
        await expect(dotc.connect(acc3).makeOffer(WithdrawalAssetERC1155, DepositAssetERC20, Offer))
          .to.be.revertedWithCustomError(assetHelper, 'IncorrectAssetTypeForAddress')
          .withArgs(WithdrawalAssetERC1155.assetAddress, WithdrawalAssetERC1155.assetType);
      });

      it('Should make full offer (erc721 => erc721)', async () => {
        const { dotc, escrow, erc721, acc1, acc2, deployer } = await loadFixture(fixture);

        const offerId = 0;

        await erc721['safeTransferFrom(address,address,uint256)'](
          await deployer.getAddress(),
          await acc1.getAddress(),
          2,
        );
        await erc721['safeTransferFrom(address,address,uint256)'](
          await deployer.getAddress(),
          await acc2.getAddress(),
          4,
        );

        await erc721.connect(acc1).setApprovalForAll(dotc.address, true);
        await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

        const DepositAssetERC721: AssetStruct = {
          assetType: 2,
          assetAddress: erc721.address,
          assetPrice: AssetPrice,
          amount: 1,
          tokenId: 2,
        };

        const WithdrawalAssetERC721: AssetStruct = {
          assetType: 2,
          assetAddress: erc721.address,
          assetPrice: AssetPrice,
          amount: 1,
          tokenId: 4,
        };

        const unitPrice = BigNumber.from(WithdrawalAssetERC721.amount)
          .mul(WAD)
          .div(BigNumber.from(DepositAssetERC721.amount));

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.BlockOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc1.getAddress(),
          offerFillType: OfferFillType.NotTaken,
          depositAsset: DepositAssetERC721,
          withdrawalAsset: WithdrawalAssetERC721,
          offer: Offer,
        };

        const make_offer = await dotc
          .connect(acc1)
          .makeOffer(DepositAssetERC721, WithdrawalAssetERC721, AwaitingOffer.offer);

        await expect(make_offer).to.emit(dotc, 'CreatedOffer');
        await expect(make_offer)
          .to.emit(escrow, 'OfferDeposited')
          .withArgs(offerId, await acc1.getAddress(), DepositAssetERC721.amount);

        expect(await dotc.currentOfferId()).to.be.eq(offerId + 1);
        expect(await erc721.ownerOf(2)).to.eq(escrow.address);

        expect(await dotc.offersFromAddress(await acc1.getAddress(), offerId)).to.eq(0);

        expect((await dotc.allOffers(0)).offer.takingOfferType).to.eq(AwaitingOffer.offer.takingOfferType);
        expect((await dotc.allOffers(0)).maker).to.eq(AwaitingOffer.maker);
        expect((await dotc.allOffers(0)).offerFillType).to.eq(AwaitingOffer.offerFillType);
        expect((await dotc.allOffers(0)).offer.offerPrice.unitPrice).to.eq(unitPrice);
        expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq(AwaitingOffer.offer.specialAddresses);
        expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(AwaitingOffer.offer.expiryTimestamp);
        expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(AwaitingOffer.offer.timelockPeriod);
        expect((await dotc.allOffers(0)).offer.terms).to.eq(AwaitingOffer.offer.terms);
        expect((await dotc.allOffers(0)).offer.commsLink).to.eq(AwaitingOffer.offer.commsLink);

        expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(DepositAssetERC721.amount);
        expect((await escrow.escrowDeposits(offerId)).depositAsset.assetAddress).to.be.eq(
          DepositAssetERC721.assetAddress,
        );
        expect((await escrow.escrowDeposits(offerId)).depositAsset.assetType).to.be.eq(DepositAssetERC721.assetType);
        expect((await escrow.escrowDeposits(offerId)).depositAsset.tokenId).to.be.eq(DepositAssetERC721.tokenId);

        expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
          EscrowOfferStatusType.OfferDeposited,
        );
      });

      it('Should make full offer (erc1155 => erc1155)', async () => {
        const { dotc, escrow, erc1155, acc1, acc2, deployer } = await loadFixture(fixture);

        const offerId = 0;

        await erc1155.safeTransferFrom(await deployer.getAddress(), await acc1.getAddress(), 5, 202, '0x00');
        await erc1155.safeTransferFrom(await deployer.getAddress(), await acc2.getAddress(), 3, 202, '0x00');

        await erc1155.connect(acc1).setApprovalForAll(dotc.address, true);
        await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

        const DepositAssetERC1155: AssetStruct = {
          assetType: 3,
          assetAddress: erc1155.address,
          assetPrice: AssetPrice,
          amount: 42,
          tokenId: 5,
        };

        const WithdrawalAssetERC1155: AssetStruct = {
          assetType: 3,
          assetAddress: erc1155.address,
          assetPrice: AssetPrice,
          amount: 202,
          tokenId: 3,
        };

        const unitPrice = BigNumber.from(WithdrawalAssetERC1155.amount)
          .mul(WAD)
          .div(BigNumber.from(DepositAssetERC1155.amount));

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.BlockOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc1.getAddress(),
          offerFillType: OfferFillType.NotTaken,
          depositAsset: DepositAssetERC1155,
          withdrawalAsset: WithdrawalAssetERC1155,
          offer: Offer,
        };

        const make_offer = await dotc
          .connect(acc1)
          .makeOffer(DepositAssetERC1155, WithdrawalAssetERC1155, AwaitingOffer.offer);

        await expect(make_offer).to.emit(dotc, 'CreatedOffer');
        await expect(make_offer)
          .to.emit(escrow, 'OfferDeposited')
          .withArgs(offerId, await acc1.getAddress(), DepositAssetERC1155.amount);

        expect(await dotc.currentOfferId()).to.be.eq(offerId + 1);
        expect(await erc1155.balanceOf(escrow.address, DepositAssetERC1155.tokenId)).to.eq(DepositAssetERC1155.amount);

        expect(await dotc.offersFromAddress(await acc1.getAddress(), offerId)).to.eq(0);

        expect((await dotc.allOffers(0)).offer.takingOfferType).to.eq(AwaitingOffer.offer.takingOfferType);
        expect((await dotc.allOffers(0)).maker).to.eq(AwaitingOffer.maker);
        expect((await dotc.allOffers(0)).offerFillType).to.eq(AwaitingOffer.offerFillType);
        expect((await dotc.allOffers(0)).offer.offerPrice.unitPrice).to.eq(unitPrice);
        expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq(AwaitingOffer.offer.specialAddresses);
        expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(AwaitingOffer.offer.expiryTimestamp);
        expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(AwaitingOffer.offer.timelockPeriod);
        expect((await dotc.allOffers(0)).offer.terms).to.eq(AwaitingOffer.offer.terms);
        expect((await dotc.allOffers(0)).offer.commsLink).to.eq(AwaitingOffer.offer.commsLink);

        expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(DepositAssetERC1155.amount);
        expect((await escrow.escrowDeposits(offerId)).depositAsset.assetAddress).to.be.eq(
          DepositAssetERC1155.assetAddress,
        );
        expect((await escrow.escrowDeposits(offerId)).depositAsset.assetType).to.be.eq(DepositAssetERC1155.assetType);
        expect((await escrow.escrowDeposits(offerId)).depositAsset.tokenId).to.be.eq(DepositAssetERC1155.tokenId);

        expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
          EscrowOfferStatusType.OfferDeposited,
        );
      });

      it('Should not revert making offer', async () => {
        const { dotc, assetHelper, erc20_18, erc20_6, erc721, acc1, acc2 } = await loadFixture(fixture);

        const amountIn = 43;
        const amountOut = 104;

        const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));
        const amountOut_asset = BigNumber.from(amountOut).mul(BigNumber.from(10).pow(decimals_6));

        await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
        await erc20_6.transfer(await acc2.getAddress(), amountOut_asset);

        await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
        await erc20_6.connect(acc2).approve(dotc.address, amountOut_asset);

        const DepositAssetERC20: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_18.address,
          assetPrice: AssetPrice,
          amount: amountIn_asset,
          tokenId: 0,
        };

        const WithdrawalAssetERC20: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_6.address,
          assetPrice: AssetPrice,
          amount: amountOut_asset,
          tokenId: 0,
        };

        const WithdrawalAssetERC721_false: AssetStruct = {
          assetType: 2,
          assetAddress: erc721.address,
          assetPrice: AssetPrice,
          amount: 204,
          tokenId: 4,
        };

        let DepositAssetERC20_false: AssetStruct = {
          assetType: 0,
          assetAddress: erc20_18.address,
          assetPrice: AssetPrice,
          amount: amountIn_asset,
          tokenId: 0,
        };

        let WithdrawalAssetERC20_false: AssetStruct = {
          assetType: 0,
          assetAddress: erc20_6.address,
          assetPrice: AssetPrice,
          amount: amountOut_asset,
          tokenId: 0,
        };

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.BlockOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        await expect(
          dotc.makeOffer(DepositAssetERC20_false, WithdrawalAssetERC20, Offer),
        ).to.be.revertedWithCustomError(assetHelper, 'AssetTypeUndefinedError');

        DepositAssetERC20_false = {
          assetType: 1,
          assetAddress: addressZero,
          assetPrice: AssetPrice,
          amount: amountIn_asset,
          tokenId: 0,
        };

        await expect(
          dotc.makeOffer(DepositAssetERC20_false, WithdrawalAssetERC20, Offer),
        ).to.be.revertedWithCustomError(assetHelper, 'AssetAddressIsZeroError');

        DepositAssetERC20_false = {
          assetType: 1,
          assetAddress: erc20_18.address,
          assetPrice: AssetPrice,
          amount: 0,
          tokenId: 0,
        };

        await expect(
          dotc.makeOffer(DepositAssetERC20_false, WithdrawalAssetERC20, Offer),
        ).to.be.revertedWithCustomError(assetHelper, 'AssetAmountIsZeroError');

        await expect(
          dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20_false, Offer),
        ).to.be.revertedWithCustomError(assetHelper, 'AssetTypeUndefinedError');

        WithdrawalAssetERC20_false = {
          assetType: 1,
          assetAddress: addressZero,
          assetPrice: AssetPrice,
          amount: amountOut_asset,
          tokenId: 0,
        };

        await expect(
          dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20_false, Offer),
        ).to.be.revertedWithCustomError(assetHelper, 'AssetAddressIsZeroError');

        WithdrawalAssetERC20_false = {
          assetType: 1,
          assetAddress: erc20_6.address,
          assetPrice: AssetPrice,
          amount: 0,
          tokenId: 0,
        };

        await expect(
          dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20_false, Offer),
        ).to.be.revertedWithCustomError(assetHelper, 'AssetAmountIsZeroError');

        await expect(
          dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC721_false, Offer),
        ).to.be.revertedWithCustomError(assetHelper, 'ERC721AmountExceedsOneError');
        await expect(
          dotc.makeOffer(WithdrawalAssetERC721_false, DepositAssetERC20, Offer),
        ).to.be.revertedWithCustomError(assetHelper, 'ERC721AmountExceedsOneError');
      });
    });

    describe('Dynamic assetPrice', () => {
      it('Should make dynamic price offer (erc20 => erc20)', async () => {
        const {
          dotc,
          assetHelper,
          offerHelper,
          priceFeed_fake,
          priceFeed_6,
          priceFeed_18,
          erc20_18,
          erc20_6,
          acc1,
          acc2,
        } = await loadFixture(fixture);

        let offerId = 0;

        const amountIn = ethers.utils.parseEther('5');
        const amountOut = BigNumber.from(15000).mul(BigNumber.from(10).pow(decimals_6));

        await erc20_18.transfer(await acc1.getAddress(), amountIn.mul(2));
        await erc20_6.transfer(await acc2.getAddress(), amountOut);

        await erc20_18.connect(acc1).approve(dotc.address, amountIn.mul(2));
        await erc20_6.connect(acc2).approve(dotc.address, amountOut);

        const depositAssetPrice = await priceFeed_18.latestAnswer();
        const [, withdrawalAssetPrice] = await priceFeed_6.latestRoundData();

        const OfferPrice: OfferPriceStruct = {
          offerPricingType: OfferPricingType.DynamicPricing,
          unitPrice: 0,
          percentage: 100,
          percentageType: PercentageType.Plus,
        };

        const PriceDeposit: AssetPriceStruct = {
          priceFeedAddress: priceFeed_18.address,
          offerMaximumPrice: 0,
          offerMinimumPrice: depositAssetPrice,
        };

        const PriceWithdrawal: AssetPriceStruct = {
          priceFeedAddress: priceFeed_6.address,
          offerMaximumPrice: 0,
          offerMinimumPrice: withdrawalAssetPrice,
        };

        const DepositAssetERC20: AssetStruct = {
          assetType: AssetType.ERC20,
          assetAddress: erc20_18.address,
          assetPrice: PriceDeposit,
          amount: amountIn,
          tokenId: 0,
        };

        const WithdrawalAssetERC20: AssetStruct = {
          assetType: AssetType.ERC20,
          assetAddress: erc20_6.address,
          assetPrice: PriceWithdrawal,
          amount: amountOut,
          tokenId: 0,
        };

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.BlockOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc1.getAddress(),
          offerFillType: OfferFillType.NotTaken,
          depositAsset: DepositAssetERC20,
          withdrawalAsset: WithdrawalAssetERC20,
          offer: Offer,
        };

        await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

        const standardizedDepositPrice = standardizeNumber(depositAssetPrice, priceFeed_decimals);
        const standardizedWithdrawalPrice = standardizeNumber(withdrawalAssetPrice, priceFeed_decimals);
        let depositToWithdrawalRate = standardizedDepositPrice
          .mul(BigNumber.from(10).pow(decimals_6))
          .div(standardizedWithdrawalPrice);
        depositToWithdrawalRate = getRateWithPercentage(depositToWithdrawalRate, Offer.offerPrice);

        const withdrawalAmount = depositToWithdrawalRate
          .mul(DepositAssetERC20.amount)
          .div(BigNumber.from(10).pow(decimals_18));

        expect((await dotc.allOffers(offerId)).offer.offerPrice.unitPrice).to.eq(depositToWithdrawalRate);

        expect((await dotc.allOffers(offerId)).withdrawalAsset.amount).to.eq(withdrawalAmount);
        expect((await dotc.allOffers(offerId)).offer.takingOfferType).to.eq(Offer.takingOfferType);

        offerId++;

        Offer.takingOfferType = TakingOfferType.PartialOffer;
        await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);
        expect((await dotc.allOffers(offerId)).offer.takingOfferType).to.eq(Offer.takingOfferType);
        Offer.takingOfferType = TakingOfferType.BlockOffer;

        OfferPrice.percentage = 10001;
        await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20, Offer))
          .to.be.revertedWithCustomError(offerHelper, 'IncorrectPercentage')
          .withArgs(OfferPrice.percentage);
        OfferPrice.percentage = SCALING_FACTOR;

        DepositAssetERC20.assetPrice.priceFeedAddress = priceFeed_fake.address;
        await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20, Offer))
          .to.be.revertedWithCustomError(assetHelper, 'IncorrectPriceFeed')
          .withArgs(DepositAssetERC20.assetPrice.priceFeedAddress);
        DepositAssetERC20.assetPrice.priceFeedAddress = priceFeed_18.address;

        WithdrawalAssetERC20.assetPrice.priceFeedAddress = priceFeed_fake.address;
        await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20, Offer))
          .to.be.revertedWithCustomError(assetHelper, 'IncorrectPriceFeed')
          .withArgs(WithdrawalAssetERC20.assetPrice.priceFeedAddress);
        WithdrawalAssetERC20.assetPrice.priceFeedAddress = priceFeed_6.address;

        WithdrawalAssetERC20.assetPrice.priceFeedAddress = dotc.address;
        await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20, Offer)).to.be.reverted;
        WithdrawalAssetERC20.assetPrice.priceFeedAddress = priceFeed_6.address;

        WithdrawalAssetERC20.assetPrice.offerMaximumPrice = 1;
        await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20, Offer))
          .to.be.revertedWithCustomError(assetHelper, 'BothMinMaxCanNotBeSpecifiedFor')
          .withArgs(Offer.offerPrice.offerPricingType);
        WithdrawalAssetERC20.assetPrice.offerMaximumPrice = 0;

        Offer.offerPrice.percentageType = PercentageType.NoType;
        await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20, Offer)).to.be.revertedWithCustomError(
          offerHelper,
          'TypesShouldBeSpecified',
        );
        Offer.offerPrice.percentageType = PercentageType.NoType;
      });
    });

    it('Error check', async () => {
      const { dotc, erc20_18, erc20_6, acc1 } = await loadFixture(fixture);

      const deposit: AssetStruct = {
        assetType: AssetType.ERC20,
        assetAddress: erc20_6.address,
        assetPrice: AssetPrice,
        amount: 1000000,
        tokenId: 1,
      };

      const withdraw: AssetStruct = {
        assetType: AssetType.ERC20,
        assetAddress: erc20_18.address,
        assetPrice: AssetPrice,
        amount: BigNumber.from('4000000000000000000'),
        tokenId: 1,
      };

      const offer: OfferStruct = {
        takingOfferType: TakingOfferType.PartialOffer,
        offerPrice: OfferPrice,
        specialAddresses: [],
        authorizationAddresses: [],
        expiryTimestamp: 1780749061,
        timelockPeriod: 0,
        terms: '',
        commsLink: '',
      };

      await erc20_6.transfer(await acc1.getAddress(), deposit.amount);
      await erc20_6.connect(acc1).approve(dotc.address, deposit.amount);

      await dotc.connect(acc1).makeOffer(deposit, withdraw, offer);
    });
  });

  describe('Take Offer', () => {
    describe('Fixed AssetPrice', () => {
      it('Should take full offer (erc20 => erc20)', async () => {
        const {
          dotc,
          escrow,
          dotcManager,
          assetHelper,
          offerHelper,
          dotcOfferHelper,
          erc20_18,
          erc20_6,
          authorization_false,
          authorization_true,
          acc1,
          acc2,
          acc3,
          deployer,
        } = await loadFixture(fixture);

        let offerId = 0;

        const amountIn = 43;
        const amountOut = 104;

        const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));
        const amountOut_asset = BigNumber.from(amountOut).mul(BigNumber.from(10).pow(decimals_6));

        await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
        await erc20_6.transfer(await acc2.getAddress(), amountOut_asset);

        await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
        await erc20_6.connect(acc2).approve(dotc.address, amountOut_asset);

        const DepositAssetERC20 = {
          assetType: 1,
          assetAddress: erc20_18.address,
          assetPrice: AssetPrice,
          amount: amountIn_asset,
          tokenId: 0,
        };

        const WithdrawalAssetERC20 = {
          assetType: 1,
          assetAddress: erc20_6.address,
          assetPrice: AssetPrice,
          amount: amountOut_asset,
          tokenId: 0,
        };

        const Offer = {
          takingOfferType: TakingOfferType.BlockOffer,
          offerPrice: OfferPrice,
          specialAddresses: [await acc2.getAddress(), await deployer.getAddress()],
          authorizationAddresses: [authorization_true.address],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer = {
          maker: await acc1.getAddress(),
          offerFillType: OfferFillType.FullyTaken,
          depositAsset: DepositAssetERC20,
          withdrawalAsset: WithdrawalAssetERC20,
          offer: Offer,
        };

        const [fees, ,] = await assetHelper.getFees(
          WithdrawalAssetERC20.amount,
          await dotcManager.feeAmount(),
          await dotcManager.revSharePercentage(),
        );

        const deployerBalance_2 = await erc20_6.balanceOf(await deployer.getAddress());

        await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

        await expect(dotc.connect(acc3).takeOfferFixed(offerId, 0, addressZero))
          .to.be.revertedWithCustomError(offerHelper, 'NotSpecialAddressError')
          .withArgs(await acc3.getAddress());
        await expect(dotc.connect(acc2).takeOfferFixed(offerId, 1, addressZero))
          .to.be.revertedWithCustomError(dotc, 'BlockOfferShouldBePaidFully')
          .withArgs(1);
        await expect(dotc.connect(acc2).takeOfferDynamic(offerId, 0, 2, addressZero))
          .to.be.revertedWithCustomError(dotc, 'IncorrectOfferPricingType')
          .withArgs(Offer.offerPrice.offerPricingType);

        const take_offer = await dotc.connect(acc2).takeOfferFixed(offerId, 0, addressZero);

        await expect(take_offer)
          .to.emit(dotc, 'TakenOffer')
          .withArgs(
            offerId,
            await acc2.getAddress(),
            AwaitingOffer.offerFillType,
            DepositAssetERC20.amount,
            WithdrawalAssetERC20.amount,
            addressZero,
          );
        await expect(take_offer)
          .to.emit(escrow, 'OfferWithdrawn')
          .withArgs(offerId, await acc2.getAddress(), DepositAssetERC20.amount);

        expect(await erc20_18.balanceOf(escrow.address)).to.eq(0);
        expect(await erc20_18.balanceOf(await acc2.getAddress())).to.eq(DepositAssetERC20.amount);
        expect(await erc20_6.balanceOf(await acc1.getAddress())).to.eq(
          BigNumber.from(WithdrawalAssetERC20.amount).sub(BigNumber.from(fees)),
        );
        expect(await erc20_6.balanceOf(await deployer.getAddress())).to.eq(
          BigNumber.from(deployerBalance_2).add(BigNumber.from(fees)),
        );

        expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
        expect((await dotc.allOffers(0)).offerFillType).to.eq(AwaitingOffer.offerFillType);

        expect(await dotc.offersFromAddress(await acc1.getAddress(), 0)).to.eq(offerId);

        expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);
        expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
          EscrowOfferStatusType.OfferFullyWithdrawn,
        );

        await expect(dotc.connect(acc2).takeOfferFixed(50, 0, addressZero))
          .to.be.revertedWithCustomError(dotcOfferHelper, 'OfferValidityError')
          .withArgs(OfferFillType.NotTaken);
        await expect(dotc.connect(acc2).takeOfferFixed(offerId, 0, addressZero))
          .to.be.revertedWithCustomError(dotcOfferHelper, 'OfferValidityError')
          .withArgs(OfferFillType.FullyTaken);

        await expect(dotc.connect(acc1).updateOffer(offerId, Offer))
          .to.be.revertedWithCustomError(dotcOfferHelper, 'OfferValidityError')
          .withArgs(OfferFillType.FullyTaken);
        await expect(dotc.connect(acc1).cancelOffer(offerId))
          .to.be.revertedWithCustomError(dotcOfferHelper, 'OfferValidityError')
          .withArgs(OfferFillType.FullyTaken);

        offerId++;

        await time.increase(20);

        await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
        await erc20_6.transfer(await acc2.getAddress(), amountOut_asset);

        await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
        await erc20_6.connect(acc2).approve(dotc.address, amountOut_asset);

        now = (await time.latest()) + 20;

        Offer.expiryTimestamp = now;
        AwaitingOffer.offer = Offer;

        await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

        await time.increase(200);

        await expect(dotc.connect(acc2).takeOfferFixed(offerId, 0, addressZero)).to.be.revertedWithCustomError(
          offerHelper,
          'OfferExpiredError',
        );
      });

      it('Should take full offer (erc20 => erc20) (affiliate program)', async () => {
        const { dotc, dotcManager, assetHelper, erc20_18, erc20_6, acc1, acc2, acc3, deployer } = await loadFixture(
          fixture,
        );

        const amountIn = 43;
        const amountOut = 104;

        const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));
        const amountOut_asset = BigNumber.from(amountOut).mul(BigNumber.from(10).pow(decimals_6));

        await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
        await erc20_6.transfer(await acc2.getAddress(), amountOut_asset);

        await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
        await erc20_6.connect(acc2).approve(dotc.address, amountOut_asset);

        const DepositAssetERC20: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_18.address,
          assetPrice: AssetPrice,
          amount: amountIn_asset,
          tokenId: 0,
        };

        const WithdrawalAssetERC20: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_6.address,
          assetPrice: AssetPrice,
          amount: amountOut_asset,
          tokenId: 0,
        };

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.BlockOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc1.getAddress(),
          offerFillType: OfferFillType.FullyTaken,
          depositAsset: DepositAssetERC20,
          withdrawalAsset: WithdrawalAssetERC20,
          offer: Offer,
        };

        const [fees, feesToFeeReceiver, feesToAffiliate] = await assetHelper.getFees(
          WithdrawalAssetERC20.amount,
          await dotcManager.feeAmount(),
          await dotcManager.revSharePercentage(),
        );

        const deployerBalance = await erc20_6.balanceOf(await deployer.getAddress());
        const acc3Balance = await erc20_6.balanceOf(await acc3.getAddress());

        await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

        await dotc.connect(acc2).takeOfferFixed(0, 0, await acc3.getAddress());

        expect(await erc20_6.balanceOf(await acc1.getAddress())).to.eq(
          BigNumber.from(WithdrawalAssetERC20.amount).sub(BigNumber.from(fees)),
        );
        expect(await erc20_6.balanceOf(await deployer.getAddress())).to.eq(
          BigNumber.from(deployerBalance).add(BigNumber.from(feesToFeeReceiver)),
        );
        expect(await erc20_6.balanceOf(await acc3.getAddress())).to.eq(
          BigNumber.from(acc3Balance).add(BigNumber.from(feesToAffiliate)),
        );
      });

      it('Should take partial offer (erc20 => erc20)', async () => {
        const { dotc, escrow, dotcManager, assetHelper, erc20_18, erc20_6, acc1, acc2, deployer } = await loadFixture(
          fixture,
        );

        const offerId = 0;

        const amountIn = 43;
        const amountOut = 104;

        const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));
        const amountOut_asset = BigNumber.from(amountOut).mul(BigNumber.from(10).pow(decimals_6));

        const amountOut_to_take = BigNumber.from(amountOut - 50).mul(BigNumber.from(10).pow(decimals_6));

        const standardized_amountOut_to_take = standardizeNumber(amountOut_to_take, decimals_6);

        await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
        await erc20_6.transfer(await acc2.getAddress(), amountOut_asset);

        await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
        await erc20_6.connect(acc2).approve(dotc.address, amountOut_asset);

        const DepositAssetERC20: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_18.address,
          assetPrice: AssetPrice,
          amount: amountIn_asset,
          tokenId: 0,
        };

        const WithdrawalAssetERC20: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_6.address,
          assetPrice: AssetPrice,
          amount: amountOut_asset,
          tokenId: 0,
        };

        const DepositAssetERC20_standardized: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_18.address,
          assetPrice: AssetPrice,
          amount: standardizeNumber(amountIn_asset, decimals_18),
          tokenId: 0,
        };

        const WithdrawalAssetERC20_standardized: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_6.address,
          assetPrice: AssetPrice,
          amount: standardizeNumber(amountOut_asset, decimals_6),
          tokenId: 0,
        };

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.PartialOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc1.getAddress(),
          offerFillType: OfferFillType.PartiallyTaken,
          depositAsset: DepositAssetERC20_standardized,
          withdrawalAsset: WithdrawalAssetERC20_standardized,
          offer: Offer,
        };

        const unitPrice = BigNumber.from(WithdrawalAssetERC20_standardized.amount)
          .mul(WAD)
          .div(BigNumber.from(DepositAssetERC20_standardized.amount));

        const [fees, ,] = await assetHelper.getFees(
          amountOut_to_take,
          await dotcManager.feeAmount(),
          await dotcManager.revSharePercentage(),
        );

        const deployerBalance_2 = await erc20_6.balanceOf(await deployer.getAddress());

        const amountToWithdraw = standardized_amountOut_to_take.mul(WAD).div(unitPrice);

        const realAmount = unstandardizeNumber(amountToWithdraw, await erc20_18.decimals());

        await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

        const balance = await erc20_18.balanceOf(escrow.address);

        const take_offer = await dotc.connect(acc2).takeOfferFixed(offerId, amountOut_to_take, addressZero);

        await expect(take_offer)
          .to.emit(dotc, 'TakenOffer')
          .withArgs(
            offerId,
            await acc2.getAddress(),
            AwaitingOffer.offerFillType,
            realAmount,
            amountOut_to_take,
            addressZero,
          );
        await expect(take_offer)
          .to.emit(escrow, 'OfferWithdrawn')
          .withArgs(offerId, await acc2.getAddress(), realAmount);

        expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(balance.sub(realAmount));
        expect(await erc20_18.balanceOf(escrow.address)).to.eq(balance.sub(realAmount));
        expect(await erc20_18.balanceOf(await acc2.getAddress())).to.eq(realAmount);
        expect(await erc20_6.balanceOf(await acc1.getAddress())).to.eq(
          BigNumber.from(amountOut_to_take).sub(BigNumber.from(fees)),
        );
        expect(await erc20_6.balanceOf(await deployer.getAddress())).to.eq(
          BigNumber.from(deployerBalance_2).add(BigNumber.from(fees)),
        );

        expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(
          BigNumber.from(50).mul(BigNumber.from(10).pow(decimals_6)),
        );
        expect((await dotc.allOffers(0)).offerFillType).to.eq(AwaitingOffer.offerFillType);

        expect(await dotc.offersFromAddress(await acc1.getAddress(), 0)).to.eq(offerId);

        expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
          EscrowOfferStatusType.OfferPartiallyWithdrawn,
        );
      });

      it('Should take full offer (erc20 => erc20) (affiliate program)', async () => {
        const { dotc, dotcManager, assetHelper, erc20_18, erc20_6, acc1, acc2, acc3, deployer } = await loadFixture(
          fixture,
        );

        const amountIn = 43;
        const amountOut = 104;

        const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));
        const amountOut_asset = BigNumber.from(amountOut).mul(BigNumber.from(10).pow(decimals_6));

        const amountOut_to_take = BigNumber.from(amountOut - 50).mul(BigNumber.from(10).pow(decimals_6));

        await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
        await erc20_6.transfer(await acc2.getAddress(), amountOut_asset);

        await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
        await erc20_6.connect(acc2).approve(dotc.address, amountOut_asset);

        const DepositAssetERC20: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_18.address,
          assetPrice: AssetPrice,
          amount: amountIn_asset,
          tokenId: 0,
        };

        const WithdrawalAssetERC20: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_6.address,
          assetPrice: AssetPrice,
          amount: amountOut_asset,
          tokenId: 0,
        };

        const DepositAssetERC20_standardized: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_18.address,
          assetPrice: AssetPrice,
          amount: standardizeNumber(amountIn_asset, decimals_18),
          tokenId: 0,
        };

        const WithdrawalAssetERC20_standardized: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_6.address,
          assetPrice: AssetPrice,
          amount: standardizeNumber(amountOut_asset, decimals_6),
          tokenId: 0,
        };

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.PartialOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc1.getAddress(),
          offerFillType: OfferFillType.PartiallyTaken,
          depositAsset: DepositAssetERC20_standardized,
          withdrawalAsset: WithdrawalAssetERC20_standardized,
          offer: Offer,
        };

        const [fees, feesToFeeReceiver, feesToAffiliate] = await assetHelper.getFees(
          amountOut_to_take,
          await dotcManager.feeAmount(),
          await dotcManager.revSharePercentage(),
        );

        const deployerBalance = await erc20_6.balanceOf(await deployer.getAddress());
        const acc3Balance = await erc20_6.balanceOf(await acc3.getAddress());

        await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

        await dotc.connect(acc2).takeOfferFixed(0, amountOut_to_take, await acc3.getAddress());

        expect(await erc20_6.balanceOf(await acc1.getAddress())).to.eq(
          BigNumber.from(amountOut_to_take).sub(BigNumber.from(fees)),
        );
        expect(await erc20_6.balanceOf(await deployer.getAddress())).to.eq(
          BigNumber.from(deployerBalance).add(BigNumber.from(feesToFeeReceiver)),
        );
        expect(await erc20_6.balanceOf(await acc3.getAddress())).to.eq(
          BigNumber.from(acc3Balance).add(BigNumber.from(feesToAffiliate)),
        );
      });

      it('Should take partial offer fully (erc20 => erc20)', async () => {
        const { dotc, escrow, dotcManager, assetHelper, erc20_18, erc20_6, acc1, acc2, deployer } = await loadFixture(
          fixture,
        );

        const offerId = 0;

        const amountIn = 43;
        const amountOut = 104;

        const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));
        const amountOut_asset = BigNumber.from(amountOut).mul(BigNumber.from(10).pow(decimals_6));

        await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
        await erc20_6.transfer(await acc2.getAddress(), amountOut_asset);

        await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
        await erc20_6.connect(acc2).approve(dotc.address, amountOut_asset);

        const DepositAssetERC20: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_18.address,
          assetPrice: AssetPrice,
          amount: amountIn_asset,
          tokenId: 0,
        };

        const WithdrawalAssetERC20: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_6.address,
          assetPrice: AssetPrice,
          amount: amountOut_asset,
          tokenId: 0,
        };

        const DepositAssetERC20_standardized: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_18.address,
          assetPrice: AssetPrice,
          amount: standardizeNumber(amountIn_asset, decimals_18),
          tokenId: 0,
        };

        const WithdrawalAssetERC20_standardized: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_6.address,
          assetPrice: AssetPrice,
          amount: standardizeNumber(amountOut_asset, decimals_6),
          tokenId: 0,
        };

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.PartialOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc1.getAddress(),
          offerFillType: OfferFillType.FullyTaken,
          depositAsset: DepositAssetERC20_standardized,
          withdrawalAsset: WithdrawalAssetERC20_standardized,
          offer: Offer,
        };

        const [fees, ,] = await assetHelper.getFees(
          amountOut_asset,
          await dotcManager.feeAmount(),
          await dotcManager.revSharePercentage(),
        );

        const deployerBalance_2 = await erc20_6.balanceOf(await deployer.getAddress());

        await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

        const balance = await erc20_18.balanceOf(escrow.address);

        const take_offer = await dotc.connect(acc2).takeOfferFixed(offerId, WithdrawalAssetERC20.amount, addressZero);

        await expect(take_offer)
          .to.emit(dotc, 'TakenOffer')
          .withArgs(
            offerId,
            await acc2.getAddress(),
            AwaitingOffer.offerFillType,
            DepositAssetERC20.amount,
            WithdrawalAssetERC20.amount,
            addressZero,
          );

        await expect(take_offer)
          .to.emit(escrow, 'OfferWithdrawn')
          .withArgs(offerId, await acc2.getAddress(), DepositAssetERC20.amount);

        expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(
          balance.sub(BigNumber.from(DepositAssetERC20.amount)),
        ); //0
        expect(await erc20_18.balanceOf(escrow.address)).to.eq(balance.sub(BigNumber.from(DepositAssetERC20.amount))); //0
        expect(await erc20_18.balanceOf(await acc2.getAddress())).to.eq(DepositAssetERC20.amount);
        expect(await erc20_6.balanceOf(await acc1.getAddress())).to.eq(
          BigNumber.from(amountOut_asset).sub(BigNumber.from(fees)),
        );
        expect(await erc20_6.balanceOf(await deployer.getAddress())).to.eq(
          BigNumber.from(deployerBalance_2).add(BigNumber.from(fees)),
        );

        expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
        expect((await dotc.allOffers(0)).offerFillType).to.eq(AwaitingOffer.offerFillType);

        expect(await dotc.offersFromAddress(await acc1.getAddress(), 0)).to.eq(offerId);

        expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
          EscrowOfferStatusType.OfferFullyWithdrawn,
        );
      });

      it('Should take full offer (erc20 => erc721)', async () => {
        const { dotc, escrow, dotcManager, assetHelper, erc20_18, erc721, acc1, acc2, deployer } = await loadFixture(
          fixture,
        );

        const offerId = 0;

        const amountIn = 43;

        const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));

        await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
        await erc721['safeTransferFrom(address,address,uint256)'](
          await deployer.getAddress(),
          await acc2.getAddress(),
          4,
        );

        await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
        await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

        const DepositAssetERC20: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_18.address,
          assetPrice: AssetPrice,
          amount: amountIn_asset,
          tokenId: 0,
        };

        const WithdrawalAssetERC721: AssetStruct = {
          assetType: 2,
          assetAddress: erc721.address,
          assetPrice: AssetPrice,
          amount: 1,
          tokenId: 4,
        };

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.BlockOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc1.getAddress(),
          offerFillType: OfferFillType.FullyTaken,
          depositAsset: DepositAssetERC20,
          withdrawalAsset: WithdrawalAssetERC721,
          offer: Offer,
        };

        await dotcManager.changeFees(addressZero, 0, 0);

        const [fees, ,] = await assetHelper.getFees(
          DepositAssetERC20.amount,
          await dotcManager.feeAmount(),
          await dotcManager.revSharePercentage(),
        );
        const outAmount = BigNumber.from(DepositAssetERC20.amount).sub(BigNumber.from(fees));

        const deployerBalance_2 = await erc20_18.balanceOf(await deployer.getAddress());

        await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC721, AwaitingOffer.offer);

        const take_offer = await dotc.connect(acc2).takeOfferFixed(offerId, 2, addressZero);

        await expect(take_offer)
          .to.emit(dotc, 'TakenOffer')
          .withArgs(offerId, await acc2.getAddress(), AwaitingOffer.offerFillType, outAmount, 1, addressZero);
        await expect(take_offer)
          .to.emit(escrow, 'OfferWithdrawn')
          .withArgs(offerId, await acc2.getAddress(), outAmount);

        expect(await erc20_18.balanceOf(escrow.address)).to.eq(0);
        expect(await erc20_18.balanceOf(await acc2.getAddress())).to.eq(outAmount);
        expect(await erc20_18.balanceOf(await deployer.getAddress())).to.eq(
          BigNumber.from(deployerBalance_2).add(BigNumber.from(fees)),
        );
        expect(await erc721.ownerOf(WithdrawalAssetERC721.tokenId)).to.eq(await acc1.getAddress());

        expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
        expect((await dotc.allOffers(0)).offerFillType).to.eq(AwaitingOffer.offerFillType);

        expect(await dotc.offersFromAddress(await acc1.getAddress(), 0)).to.eq(offerId);

        expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);

        expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
          EscrowOfferStatusType.OfferFullyWithdrawn,
        );
      });

      it('Should take full offer (erc20 => erc721) (affiliate program)', async () => {
        const { dotc, dotcManager, assetHelper, erc20_18, erc721, acc1, acc2, acc3, deployer } = await loadFixture(
          fixture,
        );

        const amountIn = 43;

        const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));

        await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
        await erc721['safeTransferFrom(address,address,uint256)'](
          await deployer.getAddress(),
          await acc2.getAddress(),
          4,
        );

        await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
        await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

        const DepositAssetERC20: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_18.address,
          assetPrice: AssetPrice,
          amount: amountIn_asset,
          tokenId: 0,
        };

        const WithdrawalAssetERC721: AssetStruct = {
          assetType: 2,
          assetAddress: erc721.address,
          assetPrice: AssetPrice,
          amount: 1,
          tokenId: 4,
        };

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.BlockOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc1.getAddress(),
          offerFillType: OfferFillType.FullyTaken,
          depositAsset: DepositAssetERC20,
          withdrawalAsset: WithdrawalAssetERC721,
          offer: Offer,
        };

        const [fees, feesToFeeReceiver, feesToAffiliate] = await assetHelper.getFees(
          DepositAssetERC20.amount,
          await dotcManager.feeAmount(),
          await dotcManager.revSharePercentage(),
        );

        const outAmount = BigNumber.from(DepositAssetERC20.amount).sub(BigNumber.from(fees));

        const deployerBalance = await erc20_18.balanceOf(await deployer.getAddress());
        const acc3Balance = await erc20_18.balanceOf(await acc3.getAddress());

        await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC721, AwaitingOffer.offer);

        await dotc.connect(acc2).takeOfferFixed(0, 0, await acc3.getAddress());

        expect(await erc20_18.balanceOf(await acc2.getAddress())).to.eq(outAmount);
        expect(await erc20_18.balanceOf(await deployer.getAddress())).to.eq(
          BigNumber.from(deployerBalance).add(BigNumber.from(feesToFeeReceiver)),
        );
        expect(await erc20_18.balanceOf(await acc3.getAddress())).to.eq(
          BigNumber.from(acc3Balance).add(BigNumber.from(feesToAffiliate)),
        );
      });

      it('Should take full offer (erc721 => erc20)', async () => {
        const { dotc, escrow, dotcManager, assetHelper, erc20_18, erc721, acc1, acc2, deployer } = await loadFixture(
          fixture,
        );

        const offerId = 0;

        const amountIn = 43;

        const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));

        await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
        await erc721['safeTransferFrom(address,address,uint256)'](
          await deployer.getAddress(),
          await acc2.getAddress(),
          4,
        );

        await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
        await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

        const DepositAssetERC20: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_18.address,
          assetPrice: AssetPrice,
          amount: amountIn_asset,
          tokenId: 0,
        };

        const WithdrawalAssetERC721: AssetStruct = {
          assetType: 2,
          assetAddress: erc721.address,
          assetPrice: AssetPrice,
          amount: 1,
          tokenId: 4,
        };

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.BlockOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc2.getAddress(),
          offerFillType: OfferFillType.FullyTaken,
          depositAsset: WithdrawalAssetERC721,
          withdrawalAsset: DepositAssetERC20,
          offer: Offer,
        };

        const [fees, ,] = await assetHelper.getFees(
          DepositAssetERC20.amount,
          await dotcManager.feeAmount(),
          await dotcManager.revSharePercentage(),
        );

        const deployerBalance_2 = await erc20_18.balanceOf(await deployer.getAddress());

        await dotc.connect(acc2).makeOffer(WithdrawalAssetERC721, DepositAssetERC20, AwaitingOffer.offer);

        const take_offer = await dotc.connect(acc1).takeOfferFixed(offerId, 0, addressZero);

        await expect(take_offer)
          .to.emit(dotc, 'TakenOffer')
          .withArgs(
            offerId,
            await acc1.getAddress(),
            AwaitingOffer.offerFillType,
            1,
            DepositAssetERC20.amount,
            addressZero,
          );
        await expect(take_offer)
          .to.emit(escrow, 'OfferWithdrawn')
          .withArgs(offerId, await acc1.getAddress(), 1);

        expect(await erc721.balanceOf(escrow.address)).to.eq(0);
        expect(await erc721.ownerOf(WithdrawalAssetERC721.tokenId)).to.eq(await acc1.getAddress());

        expect(await erc20_18.balanceOf(await acc2.getAddress())).to.eq(
          BigNumber.from(DepositAssetERC20.amount).sub(BigNumber.from(fees)),
        );
        expect(await erc20_18.balanceOf(await deployer.getAddress())).to.eq(
          BigNumber.from(deployerBalance_2).add(BigNumber.from(fees)),
        );

        expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
        expect((await dotc.allOffers(0)).offerFillType).to.eq(AwaitingOffer.offerFillType);

        expect(await dotc.offersFromAddress(await acc2.getAddress(), 0)).to.eq(offerId);

        expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);
      });

      it('Should take full offer (erc721 => erc20) (affiliate program)', async () => {
        const { dotc, dotcManager, assetHelper, erc20_18, erc721, acc1, acc2, acc3, deployer } = await loadFixture(
          fixture,
        );

        const offerId = 0;

        const amountIn = 43;

        const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));

        await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
        await erc721['safeTransferFrom(address,address,uint256)'](
          await deployer.getAddress(),
          await acc2.getAddress(),
          4,
        );

        await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
        await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

        const DepositAssetERC20: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_18.address,
          assetPrice: AssetPrice,
          amount: amountIn_asset,
          tokenId: 0,
        };

        const WithdrawalAssetERC721: AssetStruct = {
          assetType: 2,
          assetAddress: erc721.address,
          assetPrice: AssetPrice,
          amount: 1,
          tokenId: 4,
        };

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.BlockOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc2.getAddress(),
          offerFillType: OfferFillType.FullyTaken,
          depositAsset: WithdrawalAssetERC721,
          withdrawalAsset: DepositAssetERC20,
          offer: Offer,
        };

        const [fees, feesToFeeReceiver, feesToAffiliate] = await assetHelper.getFees(
          DepositAssetERC20.amount,
          await dotcManager.feeAmount(),
          await dotcManager.revSharePercentage(),
        );

        const outAmount = BigNumber.from(DepositAssetERC20.amount).sub(BigNumber.from(fees));

        const deployerBalance = await erc20_18.balanceOf(await deployer.getAddress());
        const acc3Balance = await erc20_18.balanceOf(await acc3.getAddress());

        await dotc.connect(acc2).makeOffer(WithdrawalAssetERC721, DepositAssetERC20, AwaitingOffer.offer);

        await dotc.connect(acc1).takeOfferFixed(offerId, 0, await acc3.getAddress());

        expect(await erc20_18.balanceOf(await acc2.getAddress())).to.eq(outAmount);
        expect(await erc20_18.balanceOf(await deployer.getAddress())).to.eq(
          BigNumber.from(deployerBalance).add(BigNumber.from(feesToFeeReceiver)),
        );
        expect(await erc20_18.balanceOf(await acc3.getAddress())).to.eq(
          BigNumber.from(acc3Balance).add(BigNumber.from(feesToAffiliate)),
        );
      });

      it('Should take full offer (erc20 => erc1155) (affiliate program)', async () => {
        const { dotc, dotcManager, assetHelper, erc20_18, erc1155, acc1, acc2, acc3, deployer } = await loadFixture(
          fixture,
        );

        const amountIn = 43;

        const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));

        await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
        await erc1155.safeTransferFrom(await deployer.getAddress(), await acc2.getAddress(), 3, 202, '0x00');

        await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
        await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

        const DepositAssetERC20: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_18.address,
          assetPrice: AssetPrice,
          amount: amountIn_asset,
          tokenId: 0,
        };

        const WithdrawalAssetERC1155: AssetStruct = {
          assetType: 3,
          assetAddress: erc1155.address,
          assetPrice: AssetPrice,
          amount: 202,
          tokenId: 3,
        };

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.BlockOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc1.getAddress(),
          offerFillType: OfferFillType.FullyTaken,
          depositAsset: DepositAssetERC20,
          withdrawalAsset: WithdrawalAssetERC1155,
          offer: Offer,
        };

        const [fees, feesToFeeReceiver, feesToAffiliate] = await assetHelper.getFees(
          DepositAssetERC20.amount,
          await dotcManager.feeAmount(),
          await dotcManager.revSharePercentage(),
        );

        const outAmount = BigNumber.from(DepositAssetERC20.amount).sub(BigNumber.from(fees));

        const deployerBalance = await erc20_18.balanceOf(await deployer.getAddress());
        const acc3Balance = await erc20_18.balanceOf(await acc3.getAddress());

        await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC1155, AwaitingOffer.offer);

        await dotc.connect(acc2).takeOfferFixed(0, 0, await acc3.getAddress());

        expect(await erc20_18.balanceOf(await acc2.getAddress())).to.eq(outAmount);

        expect(await erc20_18.balanceOf(await deployer.getAddress())).to.eq(
          BigNumber.from(deployerBalance).add(BigNumber.from(feesToFeeReceiver)),
        );
        expect(await erc20_18.balanceOf(await acc3.getAddress())).to.eq(
          BigNumber.from(acc3Balance).add(BigNumber.from(feesToAffiliate)),
        );
      });

      it('Should take full offer (erc1155 => erc20)', async () => {
        const { dotc, escrow, dotcManager, assetHelper, erc20_18, erc1155, acc1, acc2, deployer } = await loadFixture(
          fixture,
        );

        const offerId = 0;

        const amountIn = 43;

        const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));

        await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
        await erc1155.safeTransferFrom(await deployer.getAddress(), await acc2.getAddress(), 3, 202, '0x00');

        await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
        await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

        const DepositAssetERC20: AssetStruct = {
          assetType: 1,
          assetAddress: erc20_18.address,
          assetPrice: AssetPrice,
          amount: amountIn_asset,
          tokenId: 0,
        };

        const WithdrawalAssetERC1155: AssetStruct = {
          assetType: 3,
          assetAddress: erc1155.address,
          assetPrice: AssetPrice,
          amount: 202,
          tokenId: 3,
        };

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.BlockOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc2.getAddress(),
          offerFillType: OfferFillType.FullyTaken,
          depositAsset: WithdrawalAssetERC1155,
          withdrawalAsset: DepositAssetERC20,
          offer: Offer,
        };

        await dotcManager.changeFees(addressZero, 0, 0);

        const [fees, ,] = await assetHelper.getFees(
          DepositAssetERC20.amount,
          await dotcManager.feeAmount(),
          await dotcManager.revSharePercentage(),
        );

        const deployerBalance_2 = await erc20_18.balanceOf(await deployer.getAddress());

        await dotc.connect(acc2).makeOffer(WithdrawalAssetERC1155, DepositAssetERC20, AwaitingOffer.offer);

        const take_offer = await dotc.connect(acc1).takeOfferFixed(offerId, 0, addressZero);

        await expect(take_offer)
          .to.emit(dotc, 'TakenOffer')
          .withArgs(
            offerId,
            await acc1.getAddress(),
            AwaitingOffer.offerFillType,
            WithdrawalAssetERC1155.amount,
            DepositAssetERC20.amount,
            addressZero,
          );
        await expect(take_offer)
          .to.emit(escrow, 'OfferWithdrawn')
          .withArgs(offerId, await acc1.getAddress(), WithdrawalAssetERC1155.amount);

        expect(await erc1155.balanceOf(escrow.address, WithdrawalAssetERC1155.tokenId)).to.eq(0);
        expect(await erc1155.balanceOf(await acc1.getAddress(), WithdrawalAssetERC1155.tokenId)).to.eq(
          WithdrawalAssetERC1155.amount,
        );

        expect(await erc20_18.balanceOf(await acc2.getAddress())).to.eq(
          BigNumber.from(DepositAssetERC20.amount).sub(BigNumber.from(fees)),
        );
        expect(await erc20_18.balanceOf(await deployer.getAddress())).to.eq(
          BigNumber.from(deployerBalance_2).add(BigNumber.from(fees)),
        );

        expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
        expect((await dotc.allOffers(0)).offerFillType).to.eq(AwaitingOffer.offerFillType);

        expect(await dotc.offersFromAddress(await acc2.getAddress(), 0)).to.eq(offerId);

        expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);

        expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
          EscrowOfferStatusType.OfferFullyWithdrawn,
        );
      });

      it('Should take full offer (erc721 => erc721)', async () => {
        const { dotc, escrow, erc721, acc1, acc2, deployer } = await loadFixture(fixture);

        const offerId = 0;

        await erc721['safeTransferFrom(address,address,uint256)'](
          await deployer.getAddress(),
          await acc1.getAddress(),
          2,
        );
        await erc721['safeTransferFrom(address,address,uint256)'](
          await deployer.getAddress(),
          await acc2.getAddress(),
          4,
        );

        await erc721.connect(acc1).setApprovalForAll(dotc.address, true);
        await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

        const DepositAssetERC721: AssetStruct = {
          assetType: 2,
          assetAddress: erc721.address,
          assetPrice: AssetPrice,
          amount: 1,
          tokenId: 2,
        };

        const WithdrawalAssetERC721: AssetStruct = {
          assetType: 2,
          assetAddress: erc721.address,
          assetPrice: AssetPrice,
          amount: 1,
          tokenId: 4,
        };

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.BlockOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc1.getAddress(),
          offerFillType: OfferFillType.FullyTaken,
          depositAsset: DepositAssetERC721,
          withdrawalAsset: WithdrawalAssetERC721,
          offer: Offer,
        };

        await dotc.connect(acc1).makeOffer(DepositAssetERC721, WithdrawalAssetERC721, AwaitingOffer.offer);

        const take_offer = await dotc.connect(acc2).takeOfferFixed(offerId, 0, addressZero);

        await expect(take_offer)
          .to.emit(dotc, 'TakenOffer')
          .withArgs(
            offerId,
            await acc2.getAddress(),
            AwaitingOffer.offerFillType,
            AwaitingOffer.depositAsset.amount,
            1,
            addressZero,
          );
        await expect(take_offer)
          .to.emit(escrow, 'OfferWithdrawn')
          .withArgs(offerId, await acc2.getAddress(), 1);

        expect(await erc721.balanceOf(escrow.address)).to.eq(0);
        expect(await erc721.ownerOf(DepositAssetERC721.tokenId)).to.eq(await acc2.getAddress());
        expect(await erc721.ownerOf(WithdrawalAssetERC721.tokenId)).to.eq(await acc1.getAddress());

        expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
        expect((await dotc.allOffers(0)).offerFillType).to.eq(AwaitingOffer.offerFillType);

        expect(await dotc.offersFromAddress(await acc1.getAddress(), 0)).to.eq(offerId);

        expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);

        expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
          EscrowOfferStatusType.OfferFullyWithdrawn,
        );
      });

      it('Should take full offer (erc1155 => erc1155)', async () => {
        const { dotc, escrow, erc1155, acc1, acc2, deployer } = await loadFixture(fixture);

        const offerId = 0;

        await erc1155.safeTransferFrom(await deployer.getAddress(), await acc1.getAddress(), 5, 202, '0x00');
        await erc1155.safeTransferFrom(await deployer.getAddress(), await acc2.getAddress(), 3, 202, '0x00');

        await erc1155.connect(acc1).setApprovalForAll(dotc.address, true);
        await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

        const DepositAssetERC1155: AssetStruct = {
          assetType: 3,
          assetAddress: erc1155.address,
          assetPrice: AssetPrice,
          amount: 42,
          tokenId: 5,
        };

        const WithdrawalAssetERC1155: AssetStruct = {
          assetType: 3,
          assetAddress: erc1155.address,
          assetPrice: AssetPrice,
          amount: 202,
          tokenId: 3,
        };

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.BlockOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc1.getAddress(),
          offerFillType: OfferFillType.FullyTaken,
          depositAsset: DepositAssetERC1155,
          withdrawalAsset: WithdrawalAssetERC1155,
          offer: Offer,
        };

        await dotc.connect(acc1).makeOffer(DepositAssetERC1155, WithdrawalAssetERC1155, AwaitingOffer.offer);

        const take_offer = await dotc.connect(acc2).takeOfferFixed(offerId, 0, addressZero);

        await expect(take_offer)
          .to.emit(dotc, 'TakenOffer')
          .withArgs(
            offerId,
            await acc2.getAddress(),
            AwaitingOffer.offerFillType,
            AwaitingOffer.depositAsset.amount,
            AwaitingOffer.withdrawalAsset.amount,
            addressZero,
          );
        await expect(take_offer)
          .to.emit(escrow, 'OfferWithdrawn')
          .withArgs(offerId, await acc2.getAddress(), DepositAssetERC1155.amount);

        expect(await erc1155.balanceOf(escrow.address, DepositAssetERC1155.tokenId)).to.eq(0);
        expect(await erc1155.balanceOf(await acc1.getAddress(), WithdrawalAssetERC1155.tokenId)).to.eq(
          WithdrawalAssetERC1155.amount,
        );
        expect(await erc1155.balanceOf(await acc2.getAddress(), DepositAssetERC1155.tokenId)).to.eq(
          DepositAssetERC1155.amount,
        );

        expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
        expect((await dotc.allOffers(0)).offerFillType).to.eq(AwaitingOffer.offerFillType);

        expect(await dotc.offersFromAddress(await acc1.getAddress(), 0)).to.eq(offerId);

        expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);

        expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
          EscrowOfferStatusType.OfferFullyWithdrawn,
        );
      });
    });

    describe('Dynamic AssetPrice', () => {
      it.only('Should take full dynamic price offer (offerMinimumPrice) (erc20 => erc20)', async () => {
        const {
          dotc,
          escrow,
          assetHelper,
          dotcManager,
          priceFeed_6,
          priceFeed_18,
          erc20_18,
          erc20_6,
          deployer,
          acc1,
          acc2,
        } = await loadFixture(fixture);

        const offerId = 0;

        const amountIn = ethers.utils.parseEther('5');
        const amountOut = BigNumber.from(15000).mul(BigNumber.from(10).pow(decimals_6));

        await erc20_18.transfer(await acc1.getAddress(), amountIn);
        await erc20_6.transfer(await acc2.getAddress(), amountOut.mul(2));

        await erc20_18.connect(acc1).approve(dotc.address, amountIn);
        await erc20_6.connect(acc2).approve(dotc.address, amountOut.mul(2));

        const depositAssetPrice = await priceFeed_18.latestAnswer();
        const [, withdrawalAssetPrice] = await priceFeed_6.latestRoundData();

        const OfferPrice: OfferPriceStruct = {
          offerPricingType: OfferPricingType.DynamicPricing,
          unitPrice: 0,
          percentage: 100,
          percentageType: PercentageType.Plus,
        };

        const PriceDeposit: AssetPriceStruct = {
          priceFeedAddress: priceFeed_18.address,
          offerMaximumPrice: 0,
          offerMinimumPrice: depositAssetPrice,
        };

        const PriceWithdrawal: AssetPriceStruct = {
          priceFeedAddress: priceFeed_6.address,
          offerMaximumPrice: 0,
          offerMinimumPrice: withdrawalAssetPrice,
        };

        const DepositAssetERC20: AssetStruct = {
          assetType: AssetType.ERC20,
          assetAddress: erc20_18.address,
          assetPrice: PriceDeposit,
          amount: amountIn,
          tokenId: 0,
        };

        const WithdrawalAssetERC20: AssetStruct = {
          assetType: AssetType.ERC20,
          assetAddress: erc20_6.address,
          assetPrice: PriceWithdrawal,
          amount: amountOut,
          tokenId: 0,
        };

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.BlockOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc1.getAddress(),
          offerFillType: OfferFillType.FullyTaken,
          depositAsset: DepositAssetERC20,
          withdrawalAsset: WithdrawalAssetERC20,
          offer: Offer,
        };

        await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

        const standardizedDepositPrice = standardizeNumber(depositAssetPrice, priceFeed_decimals);
        const standardizedWithdrawalPrice = standardizeNumber(withdrawalAssetPrice, priceFeed_decimals);
        let depositToWithdrawalRate = standardizedDepositPrice
          .mul(BigNumber.from(10).pow(decimals_6))
          .div(standardizedWithdrawalPrice);
        depositToWithdrawalRate = getRateWithPercentage(depositToWithdrawalRate, Offer.offerPrice);

        const withdrawalAmount = depositToWithdrawalRate
          .mul(DepositAssetERC20.amount)
          .div(BigNumber.from(10).pow(decimals_18));

        const depositAmount = withdrawalAmount.mul(BigNumber.from(10).pow(decimals_18)).div(depositToWithdrawalRate);

        const [fees, ,] = await assetHelper.getFees(
          withdrawalAmount,
          await dotcManager.feeAmount(),
          await dotcManager.revSharePercentage(),
        );

        const deployerBalance_before = await erc20_6.balanceOf(await deployer.getAddress());

        await expect(
          dotc.connect(acc2).takeOfferDynamic(offerId, withdrawalAmount, depositToWithdrawalRate.sub(1), addressZero),
        ).to.be.revertedWithCustomError(dotc, 'DepositToWithdrawalRateOverflow');
        await expect(
          dotc
            .connect(acc2)
            .takeOfferDynamic(offerId, withdrawalAmount.sub(1), depositToWithdrawalRate.add(50000000), addressZero),
        )
          .to.be.revertedWithCustomError(dotc, 'BlockOfferShouldBePaidFully')
          .withArgs(withdrawalAmount.sub(1));
        await expect(dotc.connect(acc2).takeOfferFixed(offerId, withdrawalAmount, addressZero))
          .to.be.revertedWithCustomError(dotc, 'IncorrectOfferPricingType')
          .withArgs(Offer.offerPrice.offerPricingType);

        const [rate, price] = await dotc.getRateAndPrice(offerId);
        console.log('rate', rate);
        console.log('price', price);

        const take_offer = await dotc
          .connect(acc2)
          .takeOfferDynamic(offerId, withdrawalAmount, depositToWithdrawalRate.add(50000000), addressZero);

        await expect(take_offer)
          .to.emit(dotc, 'TakenOffer')
          .withArgs(
            offerId,
            await acc2.getAddress(),
            AwaitingOffer.offerFillType,
            depositAmount,
            withdrawalAmount,
            addressZero,
          );
        await expect(take_offer)
          .to.emit(escrow, 'OfferWithdrawn')
          .withArgs(offerId, await acc2.getAddress(), depositAmount);

        expect(await erc20_18.balanceOf(escrow.address)).to.eq(0);
        expect(await erc20_18.balanceOf(await acc2.getAddress())).to.eq(depositAmount);
        expect(await erc20_6.balanceOf(await acc1.getAddress())).to.eq(withdrawalAmount.sub(fees));
        expect(await erc20_6.balanceOf(await deployer.getAddress())).to.eq(
          BigNumber.from(deployerBalance_before).add(fees),
        );

        expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
        expect((await dotc.allOffers(0)).depositAsset.amount).to.eq(0);
        expect((await dotc.allOffers(0)).offerFillType).to.eq(AwaitingOffer.offerFillType);

        expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);
        expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
          EscrowOfferStatusType.OfferFullyWithdrawn,
        );
      });

      it('Should take partial dynamic price offer fully (offerMinimumPrice) (erc20 => erc20)', async () => {
        const {
          dotc,
          escrow,
          assetHelper,
          dotcManager,
          priceFeed_6,
          priceFeed_18,
          erc20_18,
          erc20_6,
          deployer,
          acc1,
          acc2,
        } = await loadFixture(fixture);

        const offerId = 0;

        const amountIn = ethers.utils.parseEther('5');
        const amountOut = BigNumber.from(15000).mul(BigNumber.from(10).pow(decimals_6));

        await erc20_18.transfer(await acc1.getAddress(), amountIn);
        await erc20_6.transfer(await acc2.getAddress(), amountOut.mul(2));

        await erc20_18.connect(acc1).approve(dotc.address, amountIn);
        await erc20_6.connect(acc2).approve(dotc.address, amountOut.mul(2));

        const depositAssetPrice = await priceFeed_18.latestAnswer();
        const [, withdrawalAssetPrice] = await priceFeed_6.latestRoundData();

        const OfferPrice: OfferPriceStruct = {
          offerPricingType: OfferPricingType.DynamicPricing,
          unitPrice: 0,
          percentage: 100,
          percentageType: PercentageType.Plus,
        };

        const PriceDeposit: AssetPriceStruct = {
          priceFeedAddress: priceFeed_18.address,
          offerMaximumPrice: 0,
          offerMinimumPrice: depositAssetPrice,
        };

        const PriceWithdrawal: AssetPriceStruct = {
          priceFeedAddress: priceFeed_6.address,
          offerMaximumPrice: 0,
          offerMinimumPrice: withdrawalAssetPrice,
        };

        const DepositAssetERC20: AssetStruct = {
          assetType: AssetType.ERC20,
          assetAddress: erc20_18.address,
          assetPrice: PriceDeposit,
          amount: amountIn,
          tokenId: 0,
        };

        const WithdrawalAssetERC20: AssetStruct = {
          assetType: AssetType.ERC20,
          assetAddress: erc20_6.address,
          assetPrice: PriceWithdrawal,
          amount: amountOut,
          tokenId: 0,
        };

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.PartialOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc1.getAddress(),
          offerFillType: OfferFillType.FullyTaken,
          depositAsset: DepositAssetERC20,
          withdrawalAsset: WithdrawalAssetERC20,
          offer: Offer,
        };

        await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

        const standardizedDepositPrice = standardizeNumber(depositAssetPrice, priceFeed_decimals);
        const standardizedWithdrawalPrice = standardizeNumber(withdrawalAssetPrice, priceFeed_decimals);
        let depositToWithdrawalRate = standardizedDepositPrice
          .mul(BigNumber.from(10).pow(decimals_6))
          .div(standardizedWithdrawalPrice);
        depositToWithdrawalRate = getRateWithPercentage(depositToWithdrawalRate, Offer.offerPrice);

        const withdrawalAmount = depositToWithdrawalRate
          .mul(DepositAssetERC20.amount)
          .div(BigNumber.from(10).pow(decimals_18));

        const [fees, ,] = await assetHelper.getFees(
          withdrawalAmount,
          await dotcManager.feeAmount(),
          await dotcManager.revSharePercentage(),
        );

        const deployerBalance_before = await erc20_6.balanceOf(await deployer.getAddress());

        const take_offer = await dotc.connect(acc2).takeOfferDynamic(offerId, withdrawalAmount, 0, addressZero);

        await expect(take_offer)
          .to.emit(dotc, 'TakenOffer')
          .withArgs(
            offerId,
            await acc2.getAddress(),
            AwaitingOffer.offerFillType,
            DepositAssetERC20.amount,
            withdrawalAmount,
            addressZero,
          );
        await expect(take_offer)
          .to.emit(escrow, 'OfferWithdrawn')
          .withArgs(offerId, await acc2.getAddress(), DepositAssetERC20.amount);

        expect(await erc20_18.balanceOf(escrow.address)).to.eq(0);
        expect(await erc20_18.balanceOf(await acc2.getAddress())).to.eq(DepositAssetERC20.amount);
        expect(await erc20_6.balanceOf(await acc1.getAddress())).to.eq(withdrawalAmount.sub(fees));
        expect(await erc20_6.balanceOf(await deployer.getAddress())).to.eq(
          BigNumber.from(deployerBalance_before).add(fees),
        );

        expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
        expect((await dotc.allOffers(0)).depositAsset.amount).to.eq(0);
        expect((await dotc.allOffers(0)).offerFillType).to.eq(AwaitingOffer.offerFillType);

        expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);
        expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
          EscrowOfferStatusType.OfferFullyWithdrawn,
        );
      });

      it('Should take partial dynamic price offer partially (offerMinimumPrice) (erc20 => erc20)', async () => {
        const {
          dotc,
          escrow,
          assetHelper,
          dotcManager,
          priceFeed_6,
          priceFeed_18,
          erc20_18,
          erc20_6,
          deployer,
          acc1,
          acc2,
        } = await loadFixture(fixture);

        const offerId = 0;

        const amountIn = ethers.utils.parseEther('5');
        const amountOut = BigNumber.from(15000).mul(BigNumber.from(10).pow(decimals_6));

        await erc20_18.transfer(await acc1.getAddress(), amountIn);
        await erc20_6.transfer(await acc2.getAddress(), amountOut.mul(2));

        await erc20_18.connect(acc1).approve(dotc.address, amountIn);
        await erc20_6.connect(acc2).approve(dotc.address, amountOut.mul(2));

        const depositAssetPrice = await priceFeed_18.latestAnswer();
        const [, withdrawalAssetPrice] = await priceFeed_6.latestRoundData();

        const OfferPrice: OfferPriceStruct = {
          offerPricingType: OfferPricingType.DynamicPricing,
          unitPrice: 0,
          percentage: 100,
          percentageType: PercentageType.Plus,
        };

        const PriceDeposit: AssetPriceStruct = {
          priceFeedAddress: priceFeed_18.address,
          offerMaximumPrice: 0,
          offerMinimumPrice: depositAssetPrice,
        };

        const PriceWithdrawal: AssetPriceStruct = {
          priceFeedAddress: priceFeed_6.address,
          offerMaximumPrice: 0,
          offerMinimumPrice: withdrawalAssetPrice,
        };

        const DepositAssetERC20: AssetStruct = {
          assetType: AssetType.ERC20,
          assetAddress: erc20_18.address,
          assetPrice: PriceDeposit,
          amount: amountIn,
          tokenId: 0,
        };

        const WithdrawalAssetERC20: AssetStruct = {
          assetType: AssetType.ERC20,
          assetAddress: erc20_6.address,
          assetPrice: PriceWithdrawal,
          amount: amountOut,
          tokenId: 0,
        };

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.PartialOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc1.getAddress(),
          offerFillType: OfferFillType.PartiallyTaken,
          depositAsset: DepositAssetERC20,
          withdrawalAsset: WithdrawalAssetERC20,
          offer: Offer,
        };

        await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

        const standardizedDepositPrice = standardizeNumber(depositAssetPrice, priceFeed_decimals);
        const standardizedWithdrawalPrice = standardizeNumber(withdrawalAssetPrice, priceFeed_decimals);
        let depositToWithdrawalRate = standardizedDepositPrice
          .mul(BigNumber.from(10).pow(decimals_6))
          .div(standardizedWithdrawalPrice);
        depositToWithdrawalRate = getRateWithPercentage(depositToWithdrawalRate, Offer.offerPrice);

        const withdrawalAmount = depositToWithdrawalRate
          .mul(DepositAssetERC20.amount)
          .div(BigNumber.from(10).pow(decimals_18));

        const withdrawalAmountPaid = withdrawalAmount.div(3);

        const depositAmount = calculatePercentage(
          BigNumber.from(DepositAssetERC20.amount),
          getPartPercentage(withdrawalAmountPaid, withdrawalAmount),
        );

        const [fees, ,] = await assetHelper.getFees(
          withdrawalAmountPaid,
          await dotcManager.feeAmount(),
          await dotcManager.revSharePercentage(),
        );

        const deployerBalance_before = await erc20_6.balanceOf(await deployer.getAddress());
        const escrow_balance = await erc20_18.balanceOf(escrow.address);

        const take_offer = await dotc.connect(acc2).takeOfferDynamic(offerId, withdrawalAmountPaid, 0, addressZero);

        await expect(take_offer)
          .to.emit(dotc, 'TakenOffer')
          .withArgs(
            offerId,
            await acc2.getAddress(),
            AwaitingOffer.offerFillType,
            depositAmount,
            withdrawalAmountPaid,
            addressZero,
          );
        await expect(take_offer)
          .to.emit(escrow, 'OfferWithdrawn')
          .withArgs(offerId, await acc2.getAddress(), depositAmount);

        expect(await erc20_18.balanceOf(escrow.address)).to.eq(escrow_balance.sub(depositAmount));
        expect(await erc20_18.balanceOf(await acc2.getAddress())).to.eq(depositAmount);
        expect(await erc20_6.balanceOf(await acc1.getAddress())).to.eq(withdrawalAmountPaid.sub(fees));
        expect(await erc20_6.balanceOf(await deployer.getAddress())).to.eq(
          BigNumber.from(deployerBalance_before).add(fees),
        );

        expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(withdrawalAmount.sub(withdrawalAmountPaid));
        expect((await dotc.allOffers(0)).depositAsset.amount).to.eq(escrow_balance.sub(depositAmount));
        expect((await dotc.allOffers(0)).offerFillType).to.eq(AwaitingOffer.offerFillType);

        expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(escrow_balance.sub(depositAmount));
        expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
          EscrowOfferStatusType.OfferPartiallyWithdrawn,
        );
      });

      it('Should take full dynamic price offer (offerMaximumPrice) (erc20 => erc20)', async () => {
        const {
          dotc,
          escrow,
          assetHelper,
          dotcManager,
          priceFeed_6,
          priceFeed_18,
          erc20_18,
          erc20_6,
          deployer,
          acc1,
          acc2,
        } = await loadFixture(fixture);

        const offerId = 0;

        const amountIn = BigNumber.from(SCALING_FACTOR).mul(BigNumber.from(10).pow(decimals_6));
        const amountOut = ethers.utils.parseEther('5');

        await erc20_6.transfer(await acc1.getAddress(), amountIn);
        await erc20_18.transfer(await acc2.getAddress(), amountOut.mul(2));

        await erc20_6.connect(acc1).approve(dotc.address, amountIn);
        await erc20_18.connect(acc2).approve(dotc.address, amountOut.mul(2));

        const withdrawalAssetPrice = await priceFeed_18.latestAnswer();
        const [, depositAssetPrice] = await priceFeed_6.latestRoundData();

        const OfferPrice: OfferPriceStruct = {
          offerPricingType: OfferPricingType.DynamicPricing,
          unitPrice: 0,
          percentage: 100,
          percentageType: PercentageType.Minus,
        };

        const PriceDeposit: AssetPriceStruct = {
          priceFeedAddress: priceFeed_6.address,
          offerMaximumPrice: depositAssetPrice.add(1),
          offerMinimumPrice: 0,
        };

        const PriceWithdrawal: AssetPriceStruct = {
          priceFeedAddress: priceFeed_18.address,
          offerMaximumPrice: withdrawalAssetPrice.add(1),
          offerMinimumPrice: 0,
        };

        const DepositAssetERC20: AssetStruct = {
          assetType: AssetType.ERC20,
          assetAddress: erc20_6.address,
          assetPrice: PriceDeposit,
          amount: amountIn,
          tokenId: 0,
        };

        const WithdrawalAssetERC20: AssetStruct = {
          assetType: AssetType.ERC20,
          assetAddress: erc20_18.address,
          assetPrice: PriceWithdrawal,
          amount: amountOut,
          tokenId: 0,
        };

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.PartialOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc1.getAddress(),
          offerFillType: OfferFillType.FullyTaken,
          depositAsset: DepositAssetERC20,
          withdrawalAsset: WithdrawalAssetERC20,
          offer: Offer,
        };

        await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

        const standardizedDepositPrice = standardizeNumber(depositAssetPrice, priceFeed_decimals);
        const standardizedWithdrawalPrice = standardizeNumber(withdrawalAssetPrice, priceFeed_decimals);
        let depositToWithdrawalRate = standardizedDepositPrice
          .mul(BigNumber.from(10).pow(decimals_18))
          .div(standardizedWithdrawalPrice);
        depositToWithdrawalRate = getRateWithPercentage(depositToWithdrawalRate, Offer.offerPrice);

        const withdrawalAmount = depositToWithdrawalRate
          .mul(DepositAssetERC20.amount)
          .div(BigNumber.from(10).pow(decimals_6));

        const depositAmount = calculatePercentage(
          BigNumber.from(DepositAssetERC20.amount),
          getPartPercentage(withdrawalAmount, withdrawalAmount),
        );

        const [fees, ,] = await assetHelper.getFees(
          withdrawalAmount,
          await dotcManager.feeAmount(),
          await dotcManager.revSharePercentage(),
        );

        const deployerBalance_before = await erc20_18.balanceOf(await deployer.getAddress());

        const take_offer = await dotc.connect(acc2).takeOfferDynamic(offerId, 0, 0, addressZero);

        expect(depositAmount).to.eq(DepositAssetERC20.amount);
        await expect(take_offer)
          .to.emit(dotc, 'TakenOffer')
          .withArgs(
            offerId,
            await acc2.getAddress(),
            AwaitingOffer.offerFillType,
            depositAmount,
            withdrawalAmount,
            addressZero,
          );
        await expect(take_offer)
          .to.emit(escrow, 'OfferWithdrawn')
          .withArgs(offerId, await acc2.getAddress(), DepositAssetERC20.amount);

        expect(await erc20_6.balanceOf(escrow.address)).to.eq(0);
        expect(await erc20_6.balanceOf(await acc2.getAddress())).to.eq(DepositAssetERC20.amount);
        expect(await erc20_18.balanceOf(await acc1.getAddress())).to.eq(withdrawalAmount.sub(fees));
        expect(await erc20_18.balanceOf(await deployer.getAddress())).to.eq(
          BigNumber.from(deployerBalance_before).add(fees),
        );

        expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
        expect((await dotc.allOffers(0)).depositAsset.amount).to.eq(0);
        expect((await dotc.allOffers(0)).offerFillType).to.eq(AwaitingOffer.offerFillType);

        expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);
        expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
          EscrowOfferStatusType.OfferFullyWithdrawn,
        );
      });

      it('Should take partial dynamic price offer fully (offerMaximumPrice) (erc20 => erc20)', async () => {
        const {
          dotc,
          escrow,
          assetHelper,
          dotcManager,
          priceFeed_6,
          priceFeed_18,
          erc20_18,
          erc20_6,
          deployer,
          acc1,
          acc2,
        } = await loadFixture(fixture);

        const offerId = 0;

        const amountIn = BigNumber.from(SCALING_FACTOR).mul(BigNumber.from(10).pow(decimals_6));
        const amountOut = ethers.utils.parseEther('5');

        await erc20_6.transfer(await acc1.getAddress(), amountIn);
        await erc20_18.transfer(await acc2.getAddress(), amountOut.mul(2));

        await erc20_6.connect(acc1).approve(dotc.address, amountIn);
        await erc20_18.connect(acc2).approve(dotc.address, amountOut.mul(2));

        const withdrawalAssetPrice = await priceFeed_18.latestAnswer();
        const [, depositAssetPrice] = await priceFeed_6.latestRoundData();

        const OfferPrice: OfferPriceStruct = {
          offerPricingType: OfferPricingType.DynamicPricing,
          unitPrice: 0,
          percentage: 100,
          percentageType: PercentageType.Minus,
        };

        const PriceDeposit: AssetPriceStruct = {
          priceFeedAddress: priceFeed_6.address,
          offerMaximumPrice: depositAssetPrice,
          offerMinimumPrice: 0,
        };

        const PriceWithdrawal: AssetPriceStruct = {
          priceFeedAddress: priceFeed_18.address,
          offerMaximumPrice: withdrawalAssetPrice,
          offerMinimumPrice: 0,
        };

        const DepositAssetERC20: AssetStruct = {
          assetType: AssetType.ERC20,
          assetAddress: erc20_6.address,
          assetPrice: PriceDeposit,
          amount: amountIn,
          tokenId: 0,
        };

        const WithdrawalAssetERC20: AssetStruct = {
          assetType: AssetType.ERC20,
          assetAddress: erc20_18.address,
          assetPrice: PriceWithdrawal,
          amount: amountOut,
          tokenId: 0,
        };

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.PartialOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc1.getAddress(),
          offerFillType: OfferFillType.FullyTaken,
          depositAsset: DepositAssetERC20,
          withdrawalAsset: WithdrawalAssetERC20,
          offer: Offer,
        };

        await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

        const standardizedDepositPrice = standardizeNumber(depositAssetPrice, priceFeed_decimals);
        const standardizedWithdrawalPrice = standardizeNumber(withdrawalAssetPrice, priceFeed_decimals);
        let depositToWithdrawalRate = standardizedDepositPrice
          .mul(BigNumber.from(10).pow(decimals_18))
          .div(standardizedWithdrawalPrice);
        depositToWithdrawalRate = getRateWithPercentage(depositToWithdrawalRate, Offer.offerPrice);

        const withdrawalAmount = depositToWithdrawalRate
          .mul(DepositAssetERC20.amount)
          .div(BigNumber.from(10).pow(decimals_6));

        const depositAmount = calculatePercentage(
          BigNumber.from(DepositAssetERC20.amount),
          getPartPercentage(withdrawalAmount, withdrawalAmount),
        );

        const [fees, ,] = await assetHelper.getFees(
          withdrawalAmount,
          await dotcManager.feeAmount(),
          await dotcManager.revSharePercentage(),
        );

        const deployerBalance_before = await erc20_18.balanceOf(await deployer.getAddress());

        const take_offer = await dotc.connect(acc2).takeOfferDynamic(offerId, withdrawalAmount, 0, addressZero);

        expect(depositAmount).to.eq(DepositAssetERC20.amount);
        await expect(take_offer)
          .to.emit(dotc, 'TakenOffer')
          .withArgs(
            offerId,
            await acc2.getAddress(),
            AwaitingOffer.offerFillType,
            depositAmount,
            withdrawalAmount,
            addressZero,
          );
        await expect(take_offer)
          .to.emit(escrow, 'OfferWithdrawn')
          .withArgs(offerId, await acc2.getAddress(), depositAmount);

        expect(await erc20_6.balanceOf(escrow.address)).to.eq(0);
        expect(await erc20_6.balanceOf(await acc2.getAddress())).to.eq(depositAmount);
        expect(await erc20_18.balanceOf(await acc1.getAddress())).to.eq(withdrawalAmount.sub(fees));
        expect(await erc20_18.balanceOf(await deployer.getAddress())).to.eq(
          BigNumber.from(deployerBalance_before).add(fees),
        );

        expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
        expect((await dotc.allOffers(0)).depositAsset.amount).to.eq(0);
        expect((await dotc.allOffers(0)).offerFillType).to.eq(AwaitingOffer.offerFillType);

        expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);
        expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
          EscrowOfferStatusType.OfferFullyWithdrawn,
        );
      });

      it('Should take partial dynamic price offer partially (offerMaximumPrice) (erc20 => erc20)', async () => {
        const {
          dotc,
          escrow,
          assetHelper,
          dotcManager,
          priceFeed_6,
          priceFeed_18,
          erc20_18,
          erc20_6,
          deployer,
          acc1,
          acc2,
        } = await loadFixture(fixture);

        const offerId = 0;

        const amountIn = BigNumber.from(SCALING_FACTOR).mul(BigNumber.from(10).pow(decimals_6));
        const amountOut = ethers.utils.parseEther('5');

        await erc20_6.transfer(await acc1.getAddress(), amountIn);
        await erc20_18.transfer(await acc2.getAddress(), amountOut.mul(2));

        await erc20_6.connect(acc1).approve(dotc.address, amountIn);
        await erc20_18.connect(acc2).approve(dotc.address, amountOut.mul(2));

        const withdrawalAssetPrice = await priceFeed_18.latestAnswer();
        const [, depositAssetPrice] = await priceFeed_6.latestRoundData();

        const OfferPrice: OfferPriceStruct = {
          offerPricingType: OfferPricingType.DynamicPricing,
          unitPrice: 0,
          percentage: 100,
          percentageType: PercentageType.Minus,
        };

        const PriceDeposit: AssetPriceStruct = {
          priceFeedAddress: priceFeed_6.address,
          offerMaximumPrice: depositAssetPrice,
          offerMinimumPrice: 0,
        };

        const PriceWithdrawal: AssetPriceStruct = {
          priceFeedAddress: priceFeed_18.address,
          offerMaximumPrice: withdrawalAssetPrice,
          offerMinimumPrice: 0,
        };

        const DepositAssetERC20: AssetStruct = {
          assetType: AssetType.ERC20,
          assetAddress: erc20_6.address,
          assetPrice: PriceDeposit,
          amount: amountIn,
          tokenId: 0,
        };

        const WithdrawalAssetERC20: AssetStruct = {
          assetType: AssetType.ERC20,
          assetAddress: erc20_18.address,
          assetPrice: PriceWithdrawal,
          amount: amountOut,
          tokenId: 0,
        };

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.PartialOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc1.getAddress(),
          offerFillType: OfferFillType.PartiallyTaken,
          depositAsset: DepositAssetERC20,
          withdrawalAsset: WithdrawalAssetERC20,
          offer: Offer,
        };

        await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

        const standardizedDepositPrice = standardizeNumber(depositAssetPrice, priceFeed_decimals);
        const standardizedWithdrawalPrice = standardizeNumber(withdrawalAssetPrice, priceFeed_decimals);
        let depositToWithdrawalRate = standardizedDepositPrice
          .mul(BigNumber.from(10).pow(decimals_18))
          .div(standardizedWithdrawalPrice);
        depositToWithdrawalRate = getRateWithPercentage(depositToWithdrawalRate, Offer.offerPrice);

        const withdrawalAmount = depositToWithdrawalRate
          .mul(DepositAssetERC20.amount)
          .div(BigNumber.from(10).pow(decimals_6));

        const withdrawalAmountPaid = withdrawalAmount.div(3);

        const depositAmount = calculatePercentage(
          BigNumber.from(DepositAssetERC20.amount),
          getPartPercentage(withdrawalAmountPaid, withdrawalAmount),
        );

        const [fees, ,] = await assetHelper.getFees(
          withdrawalAmountPaid,
          await dotcManager.feeAmount(),
          await dotcManager.revSharePercentage(),
        );

        const deployerBalance_before = await erc20_18.balanceOf(await deployer.getAddress());
        const escrow_balance = await erc20_6.balanceOf(escrow.address);

        const take_offer = await dotc.connect(acc2).takeOfferDynamic(offerId, withdrawalAmountPaid, 0, addressZero);

        await expect(take_offer)
          .to.emit(dotc, 'TakenOffer')
          .withArgs(
            offerId,
            await acc2.getAddress(),
            AwaitingOffer.offerFillType,
            depositAmount,
            withdrawalAmountPaid,
            addressZero,
          );
        await expect(take_offer)
          .to.emit(escrow, 'OfferWithdrawn')
          .withArgs(offerId, await acc2.getAddress(), depositAmount);

        expect(await erc20_6.balanceOf(escrow.address)).to.eq(escrow_balance.sub(depositAmount));
        expect(await erc20_6.balanceOf(await acc2.getAddress())).to.eq(depositAmount);
        expect(await erc20_18.balanceOf(await acc1.getAddress())).to.eq(withdrawalAmountPaid.sub(fees));
        expect(await erc20_18.balanceOf(await deployer.getAddress())).to.eq(
          BigNumber.from(deployerBalance_before).add(fees),
        );

        expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(withdrawalAmount.sub(withdrawalAmountPaid));
        expect((await dotc.allOffers(0)).depositAsset.amount).to.eq(escrow_balance.sub(depositAmount));
        expect((await dotc.allOffers(0)).offerFillType).to.eq(AwaitingOffer.offerFillType);

        expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(escrow_balance.sub(depositAmount));
        expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
          EscrowOfferStatusType.OfferPartiallyWithdrawn,
        );
      });

      it('Should take full dynamic price offer (offerMinimumPrice) (erc20 => erc1155)', async () => {
        const {
          dotc,
          escrow,
          dotcManager,
          assetHelper,
          erc20_18,
          erc1155,
          priceFeed_18,
          priceFeed_1155,
          acc1,
          acc2,
          deployer,
        } = await loadFixture(fixture);

        const offerId = 0;

        // 1 XAU = 0.769540966211224 ETH
        // ethers.utils.parseUnits("78", 16) == 0.78 ETH
        const amountIn = ethers.utils.parseUnits('78', 16);
        await erc20_18.transfer(await acc1.getAddress(), amountIn);
        await erc20_18.connect(acc1).approve(dotc.address, amountIn);

        const amountOut = 100;
        const tokenOutId = 3;
        await erc1155.safeTransferFrom(
          await deployer.getAddress(),
          await acc2.getAddress(),
          tokenOutId,
          amountOut,
          '0x00',
        );
        await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

        const depositAssetPrice = await priceFeed_18.latestAnswer();
        const [, withdrawalAssetPrice] = await priceFeed_1155.latestRoundData();

        const OfferPrice: OfferPriceStruct = {
          offerPricingType: OfferPricingType.DynamicPricing,
          unitPrice: 0,
          percentage: 100,
          percentageType: PercentageType.Plus,
        };

        const PriceDeposit: AssetPriceStruct = {
          priceFeedAddress: priceFeed_18.address,
          offerMaximumPrice: 0,
          offerMinimumPrice: depositAssetPrice,
        };

        const PriceWithdrawal: AssetPriceStruct = {
          priceFeedAddress: priceFeed_1155.address,
          offerMaximumPrice: 0,
          offerMinimumPrice: withdrawalAssetPrice,
        };

        const DepositAssetERC20: AssetStruct = {
          assetType: AssetType.ERC20,
          assetAddress: erc20_18.address,
          assetPrice: PriceDeposit,
          amount: amountIn,
          tokenId: 0,
        };

        const WithdrawalAssetERC1155: AssetStruct = {
          assetType: 3,
          assetAddress: erc1155.address,
          assetPrice: PriceWithdrawal,
          amount: amountOut,
          tokenId: tokenOutId,
        };

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.BlockOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc1.getAddress(),
          offerFillType: OfferFillType.FullyTaken,
          depositAsset: DepositAssetERC20,
          withdrawalAsset: WithdrawalAssetERC1155,
          offer: Offer,
        };

        await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC1155, AwaitingOffer.offer);

        const standardizedDepositPrice = standardizeNumber(depositAssetPrice, priceFeed_decimals);
        const standardizedWithdrawalPrice = standardizeNumber(withdrawalAssetPrice, priceFeed_decimals);
        let depositToWithdrawalRate = standardizedDepositPrice
          .mul(BigNumber.from(10).pow(27))
          .div(standardizedWithdrawalPrice);
        depositToWithdrawalRate = getRateWithPercentage(depositToWithdrawalRate, Offer.offerPrice);

        let withdrawalAmount = depositToWithdrawalRate
          .mul(DepositAssetERC20.amount)
          .div(BigNumber.from(10).pow(decimals_18));
        withdrawalAmount = withdrawalAmount.div(BigNumber.from(10).pow(27));

        const depositAmount = calculatePercentage(
          BigNumber.from(DepositAssetERC20.amount),
          BigNumber.from(SCALING_FACTOR),
        );

        const [fees, ,] = await assetHelper.getFees(
          DepositAssetERC20.amount,
          await dotcManager.feeAmount(),
          await dotcManager.revSharePercentage(),
        );
        const outAmount = BigNumber.from(DepositAssetERC20.amount).sub(BigNumber.from(fees));

        const deployerBalance_before = await erc20_18.balanceOf(await deployer.getAddress());

        const take_offer = await dotc
          .connect(acc2)
          .takeOfferDynamic(offerId, 0, depositToWithdrawalRate.mul(2), addressZero);

        expect(depositAmount).to.eq(DepositAssetERC20.amount);
        await expect(take_offer)
          .to.emit(dotc, 'TakenOffer')
          .withArgs(
            offerId,
            await acc2.getAddress(),
            AwaitingOffer.offerFillType,
            DepositAssetERC20.amount,
            withdrawalAmount,
            addressZero,
          );
        await expect(take_offer)
          .to.emit(escrow, 'OfferWithdrawn')
          .withArgs(offerId, await acc2.getAddress(), outAmount);

        expect(await erc20_18.balanceOf(escrow.address)).to.eq(0);
        expect(await erc20_18.balanceOf(await acc2.getAddress())).to.eq(outAmount);
        expect(await erc20_18.balanceOf(await deployer.getAddress())).to.eq(
          BigNumber.from(deployerBalance_before).add(BigNumber.from(fees)),
        );
        expect(await erc1155.balanceOf(await acc1.getAddress(), WithdrawalAssetERC1155.tokenId)).to.eq(
          withdrawalAmount,
        );

        expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
        expect((await dotc.allOffers(0)).offerFillType).to.eq(AwaitingOffer.offerFillType);

        expect(await dotc.offersFromAddress(await acc1.getAddress(), 0)).to.eq(offerId);

        expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);

        expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
          EscrowOfferStatusType.OfferFullyWithdrawn,
        );
      });

      it('Should take full dynamic price offer (offerMaximumPrice) (erc20 => erc1155)', async () => {
        const {
          dotc,
          escrow,
          dotcManager,
          assetHelper,
          erc20_18,
          erc1155,
          priceFeed_18,
          priceFeed_1155,
          acc1,
          acc2,
          deployer,
        } = await loadFixture(fixture);

        const offerId = 0;

        const amountIn = ethers.utils.parseEther('5');
        await erc20_18.transfer(await acc1.getAddress(), amountIn);
        await erc20_18.connect(acc1).approve(dotc.address, amountIn);

        const tokenOutId = 3;
        await erc1155.safeTransferFrom(await deployer.getAddress(), await acc2.getAddress(), tokenOutId, 10, '0x00');
        await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

        const depositAssetPrice = await priceFeed_18.latestAnswer();
        const [, withdrawalAssetPrice] = await priceFeed_1155.latestRoundData();

        const OfferPrice: OfferPriceStruct = {
          offerPricingType: OfferPricingType.DynamicPricing,
          unitPrice: 0,
          percentage: 100,
          percentageType: PercentageType.Minus,
        };

        const PriceDeposit: AssetPriceStruct = {
          priceFeedAddress: priceFeed_18.address,
          offerMaximumPrice: depositAssetPrice,
          offerMinimumPrice: 0,
        };

        const PriceWithdrawal: AssetPriceStruct = {
          priceFeedAddress: priceFeed_1155.address,
          offerMaximumPrice: withdrawalAssetPrice,
          offerMinimumPrice: 0,
        };

        const DepositAssetERC20: AssetStruct = {
          assetType: AssetType.ERC20,
          assetAddress: erc20_18.address,
          assetPrice: PriceDeposit,
          amount: amountIn,
          tokenId: 0,
        };

        const WithdrawalAssetERC1155: AssetStruct = {
          assetType: 3,
          assetAddress: erc1155.address,
          assetPrice: PriceWithdrawal,
          amount: 6,
          tokenId: tokenOutId,
        };

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.BlockOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc1.getAddress(),
          offerFillType: OfferFillType.FullyTaken,
          depositAsset: DepositAssetERC20,
          withdrawalAsset: WithdrawalAssetERC1155,
          offer: Offer,
        };

        await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC1155, AwaitingOffer.offer);

        const standardizedDepositPrice = standardizeNumber(depositAssetPrice, priceFeed_decimals);
        const standardizedWithdrawalPrice = standardizeNumber(withdrawalAssetPrice, priceFeed_decimals);
        let depositToWithdrawalRate = standardizedDepositPrice
          .mul(BigNumber.from(10).pow(27))
          .div(standardizedWithdrawalPrice);
        depositToWithdrawalRate = getRateWithPercentage(depositToWithdrawalRate, Offer.offerPrice);

        let withdrawalAmount = depositToWithdrawalRate
          .mul(DepositAssetERC20.amount)
          .div(BigNumber.from(10).pow(decimals_18));
        withdrawalAmount = withdrawalAmount.div(BigNumber.from(10).pow(27));

        const depositAmount = calculatePercentage(
          BigNumber.from(DepositAssetERC20.amount),
          getPartPercentage(withdrawalAmount, withdrawalAmount),
        );

        const [fees, ,] = await assetHelper.getFees(
          DepositAssetERC20.amount,
          await dotcManager.feeAmount(),
          await dotcManager.revSharePercentage(),
        );
        const outAmount = BigNumber.from(DepositAssetERC20.amount).sub(BigNumber.from(fees));

        const deployerBalance_before = await erc20_18.balanceOf(await deployer.getAddress());

        const take_offer = await dotc.connect(acc2).takeOfferDynamic(offerId, 200000, 0, addressZero);

        expect(depositAmount).to.eq(DepositAssetERC20.amount);
        await expect(take_offer)
          .to.emit(dotc, 'TakenOffer')
          .withArgs(
            offerId,
            await acc2.getAddress(),
            AwaitingOffer.offerFillType,
            DepositAssetERC20.amount,
            withdrawalAmount,
            addressZero,
          );
        await expect(take_offer)
          .to.emit(escrow, 'OfferWithdrawn')
          .withArgs(offerId, await acc2.getAddress(), outAmount);

        expect(await erc20_18.balanceOf(escrow.address)).to.eq(0);
        expect(await erc20_18.balanceOf(await acc2.getAddress())).to.eq(outAmount);
        expect(await erc20_18.balanceOf(await deployer.getAddress())).to.eq(
          BigNumber.from(deployerBalance_before).add(BigNumber.from(fees)),
        );
        expect(await erc1155.balanceOf(await acc1.getAddress(), WithdrawalAssetERC1155.tokenId)).to.eq(
          withdrawalAmount,
        );

        expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
        expect((await dotc.allOffers(0)).offerFillType).to.eq(AwaitingOffer.offerFillType);

        expect(await dotc.offersFromAddress(await acc1.getAddress(), 0)).to.eq(offerId);

        expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);

        expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
          EscrowOfferStatusType.OfferFullyWithdrawn,
        );
      });

      it('Should take full dynamic price offer (offerMinimumPrice) (erc1155 => erc20)', async () => {
        const {
          dotc,
          escrow,
          dotcManager,
          assetHelper,
          erc20_18,
          erc1155,
          priceFeed_18,
          priceFeed_1155,
          acc1,
          acc2,
          deployer,
        } = await loadFixture(fixture);

        const offerId = 0;

        const amountIn = ethers.utils.parseEther('5');
        await erc20_18.transfer(await acc1.getAddress(), amountIn);
        await erc20_18.connect(acc1).approve(dotc.address, amountIn);

        const tokenOutId = 3;
        await erc1155.safeTransferFrom(await deployer.getAddress(), await acc2.getAddress(), tokenOutId, 10, '0x00');
        await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

        const withdrawalAssetPrice = await priceFeed_18.latestAnswer();
        const [, depositAssetPrice] = await priceFeed_1155.latestRoundData();

        const OfferPrice: OfferPriceStruct = {
          offerPricingType: OfferPricingType.DynamicPricing,
          unitPrice: 0,
          percentage: 100,
          percentageType: PercentageType.Plus,
        };

        const PriceDeposit: AssetPriceStruct = {
          priceFeedAddress: priceFeed_18.address,
          offerMaximumPrice: 0,
          offerMinimumPrice: withdrawalAssetPrice,
        };

        const PriceWithdrawal: AssetPriceStruct = {
          priceFeedAddress: priceFeed_1155.address,
          offerMaximumPrice: 0,
          offerMinimumPrice: depositAssetPrice,
        };

        const DepositAssetERC20: AssetStruct = {
          assetType: AssetType.ERC20,
          assetAddress: erc20_18.address,
          assetPrice: PriceDeposit,
          amount: amountIn,
          tokenId: 0,
        };

        const WithdrawalAssetERC1155: AssetStruct = {
          assetType: 3,
          assetAddress: erc1155.address,
          assetPrice: PriceWithdrawal,
          amount: 6,
          tokenId: tokenOutId,
        };

        const DepositAssetERC1155 = WithdrawalAssetERC1155;
        const WithdrawalAssetERC20 = DepositAssetERC20;

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.BlockOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc1.getAddress(),
          offerFillType: OfferFillType.FullyTaken,
          depositAsset: DepositAssetERC1155,
          withdrawalAsset: WithdrawalAssetERC20,
          offer: Offer,
        };

        await dotc.connect(acc2).makeOffer(DepositAssetERC1155, WithdrawalAssetERC20, AwaitingOffer.offer);

        const standardizedDepositPrice = standardizeNumber(depositAssetPrice, priceFeed_decimals);
        const standardizedWithdrawalPrice = standardizeNumber(withdrawalAssetPrice, priceFeed_decimals);
        let depositToWithdrawalRate = standardizedDepositPrice
          .mul(BigNumber.from(10).pow(decimals_18))
          .div(standardizedWithdrawalPrice);
        depositToWithdrawalRate = getRateWithPercentage(depositToWithdrawalRate, Offer.offerPrice);

        const withdrawalAmount = depositToWithdrawalRate.mul(DepositAssetERC1155.amount);

        const depositAmount = withdrawalAmount.mul(DepositAssetERC1155.amount).div(withdrawalAmount);

        const [fees, ,] = await assetHelper.getFees(
          withdrawalAmount,
          await dotcManager.feeAmount(),
          await dotcManager.revSharePercentage(),
        );

        const deployerBalance_before = await erc20_18.balanceOf(await deployer.getAddress());

        const take_offer = await dotc.connect(acc1).takeOfferDynamic(offerId, 0, 0, addressZero);

        expect(depositAmount).to.eq(DepositAssetERC1155.amount);
        await expect(take_offer)
          .to.emit(dotc, 'TakenOffer')
          .withArgs(
            offerId,
            await acc1.getAddress(),
            AwaitingOffer.offerFillType,
            DepositAssetERC1155.amount,
            withdrawalAmount,
            addressZero,
          );
        await expect(take_offer)
          .to.emit(escrow, 'OfferWithdrawn')
          .withArgs(offerId, await acc1.getAddress(), DepositAssetERC1155.amount);

        expect(await erc1155.balanceOf(escrow.address, tokenOutId)).to.eq(0);
        expect(await erc1155.balanceOf(await acc1.getAddress(), tokenOutId)).to.eq(DepositAssetERC1155.amount);
        expect(await erc20_18.balanceOf(await deployer.getAddress())).to.eq(
          BigNumber.from(deployerBalance_before).add(BigNumber.from(fees)),
        );
        expect(await erc1155.balanceOf(await acc1.getAddress(), DepositAssetERC1155.tokenId)).to.eq(
          DepositAssetERC1155.amount,
        );

        expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
        expect((await dotc.allOffers(0)).offerFillType).to.eq(AwaitingOffer.offerFillType);

        expect(await dotc.offersFromAddress(await acc2.getAddress(), 0)).to.eq(offerId);

        expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);

        expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
          EscrowOfferStatusType.OfferFullyWithdrawn,
        );
      });

      it('Should take full dynamic price offer (offerMaximumPrice) (erc1155 => erc20)', async () => {
        const {
          dotc,
          escrow,
          dotcManager,
          assetHelper,
          erc20_18,
          erc1155,
          priceFeed_18,
          priceFeed_1155,
          acc1,
          acc2,
          deployer,
        } = await loadFixture(fixture);

        const offerId = 0;

        const amountIn = ethers.utils.parseEther('5');
        await erc20_18.transfer(await acc1.getAddress(), amountIn);
        await erc20_18.connect(acc1).approve(dotc.address, amountIn);

        const tokenOutId = 3;
        await erc1155.safeTransferFrom(await deployer.getAddress(), await acc2.getAddress(), tokenOutId, 10, '0x00');
        await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

        const withdrawalAssetPrice = await priceFeed_18.latestAnswer();
        const [, depositAssetPrice] = await priceFeed_1155.latestRoundData();

        const OfferPrice: OfferPriceStruct = {
          offerPricingType: OfferPricingType.DynamicPricing,
          unitPrice: 0,
          percentage: 100,
          percentageType: PercentageType.Minus,
        };

        const PriceDeposit: AssetPriceStruct = {
          priceFeedAddress: priceFeed_18.address,
          offerMaximumPrice: withdrawalAssetPrice,
          offerMinimumPrice: 0,
        };

        const PriceWithdrawal: AssetPriceStruct = {
          priceFeedAddress: priceFeed_1155.address,
          offerMaximumPrice: depositAssetPrice,
          offerMinimumPrice: 0,
        };

        const DepositAssetERC20: AssetStruct = {
          assetType: AssetType.ERC20,
          assetAddress: erc20_18.address,
          assetPrice: PriceDeposit,
          amount: amountIn,
          tokenId: 0,
        };

        const WithdrawalAssetERC1155: AssetStruct = {
          assetType: 3,
          assetAddress: erc1155.address,
          assetPrice: PriceWithdrawal,
          amount: 6,
          tokenId: tokenOutId,
        };

        const DepositAssetERC1155 = WithdrawalAssetERC1155;
        const WithdrawalAssetERC20 = DepositAssetERC20;

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.BlockOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc1.getAddress(),
          offerFillType: OfferFillType.FullyTaken,
          depositAsset: DepositAssetERC1155,
          withdrawalAsset: WithdrawalAssetERC20,
          offer: Offer,
        };

        await dotc.connect(acc2).makeOffer(DepositAssetERC1155, WithdrawalAssetERC20, AwaitingOffer.offer);

        const standardizedDepositPrice = standardizeNumber(depositAssetPrice, priceFeed_decimals);
        const standardizedWithdrawalPrice = standardizeNumber(withdrawalAssetPrice, priceFeed_decimals);
        let depositToWithdrawalRate = standardizedDepositPrice
          .mul(BigNumber.from(10).pow(decimals_18))
          .div(standardizedWithdrawalPrice);
        depositToWithdrawalRate = getRateWithPercentage(depositToWithdrawalRate, Offer.offerPrice);

        const withdrawalAmount = depositToWithdrawalRate.mul(DepositAssetERC1155.amount);

        const depositAmount = withdrawalAmount.mul(DepositAssetERC1155.amount).div(withdrawalAmount);

        const [fees, ,] = await assetHelper.getFees(
          withdrawalAmount,
          await dotcManager.feeAmount(),
          await dotcManager.revSharePercentage(),
        );

        const deployerBalance_before = await erc20_18.balanceOf(await deployer.getAddress());

        const take_offer = await dotc.connect(acc1).takeOfferDynamic(offerId, 0, 0, addressZero);

        expect(depositAmount).to.eq(DepositAssetERC1155.amount);
        await expect(take_offer)
          .to.emit(dotc, 'TakenOffer')
          .withArgs(
            offerId,
            await acc1.getAddress(),
            AwaitingOffer.offerFillType,
            DepositAssetERC1155.amount,
            withdrawalAmount,
            addressZero,
          );
        await expect(take_offer)
          .to.emit(escrow, 'OfferWithdrawn')
          .withArgs(offerId, await acc1.getAddress(), DepositAssetERC1155.amount);

        expect(await erc1155.balanceOf(escrow.address, tokenOutId)).to.eq(0);
        expect(await erc1155.balanceOf(await acc1.getAddress(), tokenOutId)).to.eq(DepositAssetERC1155.amount);
        expect(await erc20_18.balanceOf(await deployer.getAddress())).to.eq(
          BigNumber.from(deployerBalance_before).add(BigNumber.from(fees)),
        );
        expect(await erc1155.balanceOf(await acc1.getAddress(), DepositAssetERC1155.tokenId)).to.eq(
          DepositAssetERC1155.amount,
        );

        expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
        expect((await dotc.allOffers(0)).offerFillType).to.eq(AwaitingOffer.offerFillType);

        expect(await dotc.offersFromAddress(await acc2.getAddress(), 0)).to.eq(offerId);

        expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);

        expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
          EscrowOfferStatusType.OfferFullyWithdrawn,
        );
      });

      it('Should take full dynamic price offer (offerMinimumPrice) (erc20 => erc721)', async () => {
        const {
          dotc,
          escrow,
          dotcManager,
          assetHelper,
          erc20_18,
          erc721,
          priceFeed_18,
          priceFeed_721,
          acc1,
          acc2,
          deployer,
        } = await loadFixture(fixture);

        const offerId = 0;

        const amountIn = ethers.utils.parseUnits('78', 16);
        await erc20_18.transfer(await acc1.getAddress(), amountIn);
        await erc20_18.connect(acc1).approve(dotc.address, amountIn);

        const amountOut = 1;
        const tokenOutId = 3;
        await erc721['safeTransferFrom(address,address,uint256)'](
          await deployer.getAddress(),
          await acc2.getAddress(),
          tokenOutId,
        );
        await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

        const depositAssetPrice = await priceFeed_18.latestAnswer();
        const [, withdrawalAssetPrice] = await priceFeed_721.latestRoundData();

        const OfferPrice: OfferPriceStruct = {
          offerPricingType: OfferPricingType.DynamicPricing,
          unitPrice: 0,
          percentage: 100,
          percentageType: PercentageType.Plus,
        };

        const PriceDeposit: AssetPriceStruct = {
          priceFeedAddress: priceFeed_18.address,
          offerMaximumPrice: 0,
          offerMinimumPrice: depositAssetPrice,
        };

        const PriceWithdrawal: AssetPriceStruct = {
          priceFeedAddress: priceFeed_721.address,
          offerMaximumPrice: 0,
          offerMinimumPrice: withdrawalAssetPrice,
        };

        const DepositAssetERC20: AssetStruct = {
          assetType: AssetType.ERC20,
          assetAddress: erc20_18.address,
          assetPrice: PriceDeposit,
          amount: amountIn,
          tokenId: 0,
        };

        const WithdrawalAssetERC721: AssetStruct = {
          assetType: 2,
          assetAddress: erc721.address,
          assetPrice: PriceWithdrawal,
          amount: amountOut,
          tokenId: tokenOutId,
        };

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.BlockOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc1.getAddress(),
          offerFillType: OfferFillType.FullyTaken,
          depositAsset: DepositAssetERC20,
          withdrawalAsset: WithdrawalAssetERC721,
          offer: Offer,
        };

        await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC721, AwaitingOffer.offer);

        const standardizedDepositPrice = standardizeNumber(depositAssetPrice, priceFeed_decimals);
        const standardizedWithdrawalPrice = standardizeNumber(withdrawalAssetPrice, priceFeed_decimals);
        let depositToWithdrawalRate = standardizedDepositPrice
          .mul(BigNumber.from(10).pow(27))
          .div(standardizedWithdrawalPrice);
        depositToWithdrawalRate = getRateWithPercentage(depositToWithdrawalRate, Offer.offerPrice);

        let withdrawalAmount = depositToWithdrawalRate
          .mul(DepositAssetERC20.amount)
          .div(BigNumber.from(10).pow(decimals_18));
        withdrawalAmount = withdrawalAmount.div(BigNumber.from(10).pow(27));

        const depositAmount = calculatePercentage(
          BigNumber.from(DepositAssetERC20.amount),
          getPartPercentage(withdrawalAmount, withdrawalAmount),
        );

        const [fees, ,] = await assetHelper.getFees(
          DepositAssetERC20.amount,
          await dotcManager.feeAmount(),
          await dotcManager.revSharePercentage(),
        );
        const outAmount = BigNumber.from(DepositAssetERC20.amount).sub(BigNumber.from(fees));

        const deployerBalance_before = await erc20_18.balanceOf(await deployer.getAddress());

        const take_offer = await dotc.connect(acc2).takeOfferDynamic(offerId, 0, 0, addressZero);

        expect(depositAmount).to.eq(DepositAssetERC20.amount);
        await expect(take_offer)
          .to.emit(dotc, 'TakenOffer')
          .withArgs(
            offerId,
            await acc2.getAddress(),
            AwaitingOffer.offerFillType,
            DepositAssetERC20.amount,
            withdrawalAmount,
            addressZero,
          );
        await expect(take_offer)
          .to.emit(escrow, 'OfferWithdrawn')
          .withArgs(offerId, await acc2.getAddress(), outAmount);

        expect(await erc20_18.balanceOf(escrow.address)).to.eq(0);
        expect(await erc20_18.balanceOf(await acc2.getAddress())).to.eq(outAmount);
        expect(await erc20_18.balanceOf(await deployer.getAddress())).to.eq(
          BigNumber.from(deployerBalance_before).add(BigNumber.from(fees)),
        );
        expect(await erc721.ownerOf(WithdrawalAssetERC721.tokenId)).to.eq(await acc1.getAddress());

        expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
        expect((await dotc.allOffers(0)).offerFillType).to.eq(AwaitingOffer.offerFillType);

        expect(await dotc.offersFromAddress(await acc1.getAddress(), 0)).to.eq(offerId);

        expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);

        expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
          EscrowOfferStatusType.OfferFullyWithdrawn,
        );
      });

      it('Should take full dynamic price offer (offerMaximumPrice) (erc20 => erc721)', async () => {
        const {
          dotc,
          escrow,
          dotcManager,
          assetHelper,
          erc20_18,
          erc721,
          priceFeed_18,
          priceFeed_721,
          acc1,
          acc2,
          deployer,
        } = await loadFixture(fixture);

        const offerId = 0;

        const amountIn = ethers.utils.parseUnits('78', 16);
        await erc20_18.transfer(await acc1.getAddress(), amountIn);
        await erc20_18.connect(acc1).approve(dotc.address, amountIn);

        const amountOut = 1;
        const tokenOutId = 3;
        await erc721['safeTransferFrom(address,address,uint256)'](
          await deployer.getAddress(),
          await acc2.getAddress(),
          tokenOutId,
        );
        await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

        const depositAssetPrice = await priceFeed_18.latestAnswer();
        const [, withdrawalAssetPrice] = await priceFeed_721.latestRoundData();

        const OfferPrice: OfferPriceStruct = {
          offerPricingType: OfferPricingType.DynamicPricing,
          unitPrice: 0,
          percentage: 100,
          percentageType: PercentageType.Minus,
        };

        const PriceDeposit: AssetPriceStruct = {
          priceFeedAddress: priceFeed_18.address,
          offerMaximumPrice: depositAssetPrice,
          offerMinimumPrice: 0,
        };

        const PriceWithdrawal: AssetPriceStruct = {
          priceFeedAddress: priceFeed_721.address,
          offerMaximumPrice: withdrawalAssetPrice,
          offerMinimumPrice: 0,
        };

        const DepositAssetERC20: AssetStruct = {
          assetType: AssetType.ERC20,
          assetAddress: erc20_18.address,
          assetPrice: PriceDeposit,
          amount: amountIn,
          tokenId: 0,
        };

        const WithdrawalAssetERC721: AssetStruct = {
          assetType: 2,
          assetAddress: erc721.address,
          assetPrice: PriceWithdrawal,
          amount: amountOut,
          tokenId: tokenOutId,
        };

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.BlockOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc1.getAddress(),
          offerFillType: OfferFillType.FullyTaken,
          depositAsset: DepositAssetERC20,
          withdrawalAsset: WithdrawalAssetERC721,
          offer: Offer,
        };

        await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC721, AwaitingOffer.offer);

        // const standardizedDepositPrice = standardizeNumber(depositAssetPrice, priceFeed_decimals);
        // const standardizedWithdrawalPrice = standardizeNumber(withdrawalAssetPrice, priceFeed_decimals);
        // let depositToWithdrawalRate = standardizedDepositPrice.mul(BigNumber.from(10).pow(27)).div(standardizedWithdrawalPrice);
        // depositToWithdrawalRate = getRateWithPercentage(depositToWithdrawalRate, Offer.offerPrice);

        const withdrawalAmount = BigNumber.from(1);

        const depositAmount = calculatePercentage(
          BigNumber.from(DepositAssetERC20.amount),
          BigNumber.from(SCALING_FACTOR),
        );

        const [fees, ,] = await assetHelper.getFees(
          DepositAssetERC20.amount,
          await dotcManager.feeAmount(),
          await dotcManager.revSharePercentage(),
        );
        const outAmount = BigNumber.from(DepositAssetERC20.amount).sub(BigNumber.from(fees));

        const deployerBalance_before = await erc20_18.balanceOf(await deployer.getAddress());

        const take_offer = await dotc.connect(acc2).takeOfferDynamic(offerId, 0, 0, addressZero);

        expect(depositAmount).to.eq(DepositAssetERC20.amount);
        await expect(take_offer)
          .to.emit(dotc, 'TakenOffer')
          .withArgs(
            offerId,
            await acc2.getAddress(),
            AwaitingOffer.offerFillType,
            DepositAssetERC20.amount,
            withdrawalAmount,
            addressZero,
          );
        await expect(take_offer)
          .to.emit(escrow, 'OfferWithdrawn')
          .withArgs(offerId, await acc2.getAddress(), outAmount);

        expect(await erc20_18.balanceOf(escrow.address)).to.eq(0);
        expect(await erc20_18.balanceOf(await acc2.getAddress())).to.eq(outAmount);
        expect(await erc20_18.balanceOf(await deployer.getAddress())).to.eq(
          BigNumber.from(deployerBalance_before).add(BigNumber.from(fees)),
        );
        expect(await erc721.ownerOf(WithdrawalAssetERC721.tokenId)).to.eq(await acc1.getAddress());

        expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
        expect((await dotc.allOffers(0)).offerFillType).to.eq(AwaitingOffer.offerFillType);

        expect(await dotc.offersFromAddress(await acc1.getAddress(), 0)).to.eq(offerId);

        expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);

        expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
          EscrowOfferStatusType.OfferFullyWithdrawn,
        );
      });

      it('Should take full dynamic price offer (offerMinimumPrice) (erc20 => erc20) (MAX CHECK)', async () => {
        const {
          dotc,
          escrow,
          assetHelper,
          dotcManager,
          priceFeed_6,
          priceFeed_18,
          erc20_18,
          erc20_6,
          deployer,
          acc1,
          acc2,
        } = await loadFixture(fixture);

        const offerId = 0;

        const amountIn = ethers.utils.parseEther('5');
        const amountOut = BigNumber.from(15000).mul(BigNumber.from(10).pow(decimals_6));

        await erc20_18.transfer(await acc1.getAddress(), amountIn);
        await erc20_6.transfer(await acc2.getAddress(), amountOut.mul(2));

        await erc20_18.connect(acc1).approve(dotc.address, amountIn);
        await erc20_6.connect(acc2).approve(dotc.address, amountOut.mul(2));

        let depositAssetPrice = await priceFeed_18.latestAnswer();
        let [, withdrawalAssetPrice] = await priceFeed_6.latestRoundData();

        depositAssetPrice = depositAssetPrice.add(10000000000);
        withdrawalAssetPrice = withdrawalAssetPrice.add(10000000000);

        const OfferPrice: OfferPriceStruct = {
          offerPricingType: OfferPricingType.DynamicPricing,
          unitPrice: 0,
          percentage: 100,
          percentageType: PercentageType.Plus,
        };

        const PriceDeposit: AssetPriceStruct = {
          priceFeedAddress: priceFeed_18.address,
          offerMaximumPrice: 0,
          offerMinimumPrice: depositAssetPrice,
        };

        const PriceWithdrawal: AssetPriceStruct = {
          priceFeedAddress: priceFeed_6.address,
          offerMaximumPrice: 0,
          offerMinimumPrice: withdrawalAssetPrice,
        };

        const DepositAssetERC20: AssetStruct = {
          assetType: AssetType.ERC20,
          assetAddress: erc20_18.address,
          assetPrice: PriceDeposit,
          amount: amountIn,
          tokenId: 0,
        };

        const WithdrawalAssetERC20: AssetStruct = {
          assetType: AssetType.ERC20,
          assetAddress: erc20_6.address,
          assetPrice: PriceWithdrawal,
          amount: amountOut,
          tokenId: 0,
        };

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.BlockOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc1.getAddress(),
          offerFillType: OfferFillType.FullyTaken,
          depositAsset: DepositAssetERC20,
          withdrawalAsset: WithdrawalAssetERC20,
          offer: Offer,
        };

        await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

        const standardizedDepositPrice = standardizeNumber(depositAssetPrice, priceFeed_decimals);
        const standardizedWithdrawalPrice = standardizeNumber(withdrawalAssetPrice, priceFeed_decimals);
        let depositToWithdrawalRate = standardizedDepositPrice
          .mul(BigNumber.from(10).pow(decimals_6))
          .div(standardizedWithdrawalPrice);
        depositToWithdrawalRate = getRateWithPercentage(depositToWithdrawalRate, Offer.offerPrice);

        const withdrawalAmount = depositToWithdrawalRate
          .mul(DepositAssetERC20.amount)
          .div(BigNumber.from(10).pow(decimals_18));

        const depositAmount = withdrawalAmount.mul(BigNumber.from(10).pow(decimals_18)).div(depositToWithdrawalRate);

        const [fees, ,] = await assetHelper.getFees(
          withdrawalAmount,
          await dotcManager.feeAmount(),
          await dotcManager.revSharePercentage(),
        );

        const deployerBalance_before = await erc20_6.balanceOf(await deployer.getAddress());

        const take_offer = await dotc.connect(acc2).takeOfferDynamic(offerId, 0, 3071406681, addressZero);

        await expect(take_offer)
          .to.emit(dotc, 'TakenOffer')
          .withArgs(
            offerId,
            await acc2.getAddress(),
            AwaitingOffer.offerFillType,
            depositAmount,
            withdrawalAmount,
            addressZero,
          );
        await expect(take_offer)
          .to.emit(escrow, 'OfferWithdrawn')
          .withArgs(offerId, await acc2.getAddress(), depositAmount);

        expect(await erc20_18.balanceOf(escrow.address)).to.eq(0);
        expect(await erc20_18.balanceOf(await acc2.getAddress())).to.eq(depositAmount);
        expect(await erc20_6.balanceOf(await acc1.getAddress())).to.eq(withdrawalAmount.sub(fees));
        expect(await erc20_6.balanceOf(await deployer.getAddress())).to.eq(
          BigNumber.from(deployerBalance_before).add(fees),
        );

        expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
        expect((await dotc.allOffers(0)).depositAsset.amount).to.eq(0);
        expect((await dotc.allOffers(0)).offerFillType).to.eq(AwaitingOffer.offerFillType);

        expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);
        expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
          EscrowOfferStatusType.OfferFullyWithdrawn,
        );
      });

      it('Should take full dynamic price offer (offerMaximumPrice) (erc20 => erc20) (MIN CHECK)', async () => {
        const {
          dotc,
          escrow,
          assetHelper,
          dotcManager,
          priceFeed_6,
          priceFeed_18,
          erc20_18,
          erc20_6,
          deployer,
          acc1,
          acc2,
        } = await loadFixture(fixture);

        const offerId = 0;

        const amountIn = BigNumber.from(SCALING_FACTOR).mul(BigNumber.from(10).pow(decimals_6));
        const amountOut = ethers.utils.parseEther('5');

        await erc20_6.transfer(await acc1.getAddress(), amountIn);
        await erc20_18.transfer(await acc2.getAddress(), amountOut.mul(2));

        await erc20_6.connect(acc1).approve(dotc.address, amountIn);
        await erc20_18.connect(acc2).approve(dotc.address, amountOut.mul(2));

        let withdrawalAssetPrice = await priceFeed_18.latestAnswer();
        let [, depositAssetPrice] = await priceFeed_6.latestRoundData();

        withdrawalAssetPrice = withdrawalAssetPrice.div(2);
        depositAssetPrice = depositAssetPrice.div(2);

        const OfferPrice: OfferPriceStruct = {
          offerPricingType: OfferPricingType.DynamicPricing,
          unitPrice: 0,
          percentage: 100,
          percentageType: PercentageType.Minus,
        };

        const PriceDeposit: AssetPriceStruct = {
          priceFeedAddress: priceFeed_6.address,
          offerMaximumPrice: depositAssetPrice,
          offerMinimumPrice: 0,
        };

        const PriceWithdrawal: AssetPriceStruct = {
          priceFeedAddress: priceFeed_18.address,
          offerMaximumPrice: withdrawalAssetPrice,
          offerMinimumPrice: 0,
        };

        const DepositAssetERC20: AssetStruct = {
          assetType: AssetType.ERC20,
          assetAddress: erc20_6.address,
          assetPrice: PriceDeposit,
          amount: amountIn,
          tokenId: 0,
        };

        const WithdrawalAssetERC20: AssetStruct = {
          assetType: AssetType.ERC20,
          assetAddress: erc20_18.address,
          assetPrice: PriceWithdrawal,
          amount: amountOut,
          tokenId: 0,
        };

        const Offer: OfferStruct = {
          takingOfferType: TakingOfferType.PartialOffer,
          offerPrice: OfferPrice,
          specialAddresses: [],
          authorizationAddresses: [],
          expiryTimestamp: now + 2000,
          timelockPeriod: 0,
          terms,
          commsLink,
        };

        const AwaitingOffer: DotcOfferStruct = {
          maker: await acc1.getAddress(),
          offerFillType: OfferFillType.FullyTaken,
          depositAsset: DepositAssetERC20,
          withdrawalAsset: WithdrawalAssetERC20,
          offer: Offer,
        };

        await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

        const standardizedDepositPrice = standardizeNumber(depositAssetPrice, priceFeed_decimals);
        const standardizedWithdrawalPrice = standardizeNumber(withdrawalAssetPrice, priceFeed_decimals);
        let depositToWithdrawalRate = standardizedDepositPrice
          .mul(BigNumber.from(10).pow(decimals_18))
          .div(standardizedWithdrawalPrice);
        depositToWithdrawalRate = getRateWithPercentage(depositToWithdrawalRate, Offer.offerPrice);

        const withdrawalAmount = depositToWithdrawalRate
          .mul(DepositAssetERC20.amount)
          .div(BigNumber.from(10).pow(decimals_6));

        const depositAmount = calculatePercentage(
          BigNumber.from(DepositAssetERC20.amount),
          BigNumber.from(SCALING_FACTOR),
        );

        const [fees, ,] = await assetHelper.getFees(
          withdrawalAmount,
          await dotcManager.feeAmount(),
          await dotcManager.revSharePercentage(),
        );

        const deployerBalance_before = await erc20_18.balanceOf(await deployer.getAddress());

        const take_offer = await dotc.connect(acc2).takeOfferDynamic(offerId, 0, 0, addressZero);

        expect(depositAmount).to.eq(DepositAssetERC20.amount);
        await expect(take_offer)
          .to.emit(dotc, 'TakenOffer')
          .withArgs(
            offerId,
            await acc2.getAddress(),
            AwaitingOffer.offerFillType,
            depositAmount,
            withdrawalAmount,
            addressZero,
          );
        await expect(take_offer)
          .to.emit(escrow, 'OfferWithdrawn')
          .withArgs(offerId, await acc2.getAddress(), DepositAssetERC20.amount);

        expect(await erc20_6.balanceOf(escrow.address)).to.eq(0);
        expect(await erc20_6.balanceOf(await acc2.getAddress())).to.eq(DepositAssetERC20.amount);
        expect(await erc20_18.balanceOf(await acc1.getAddress())).to.eq(withdrawalAmount.sub(fees));
        expect(await erc20_18.balanceOf(await deployer.getAddress())).to.eq(
          BigNumber.from(deployerBalance_before).add(fees),
        );

        expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
        expect((await dotc.allOffers(0)).depositAsset.amount).to.eq(0);
        expect((await dotc.allOffers(0)).offerFillType).to.eq(AwaitingOffer.offerFillType);

        expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);
        expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
          EscrowOfferStatusType.OfferFullyWithdrawn,
        );
      });
    });
  });

  describe('Cancel Offer', () => {
    it('Should cancel full offer (erc20 => erc20)', async () => {
      const { dotc, escrow, dotcOfferHelper, erc20_18, erc20_6, acc1, acc2 } = await loadFixture(fixture);

      const offerId = 0;

      const amountIn = 43;
      const amountOut = 104;

      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));
      const amountOut_asset = BigNumber.from(amountOut).mul(BigNumber.from(10).pow(decimals_6));

      await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
      await erc20_6.transfer(await acc2.getAddress(), amountOut_asset);

      await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc20_6.connect(acc2).approve(dotc.address, amountOut_asset);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        assetPrice: AssetPrice,
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_6.address,
        assetPrice: AssetPrice,
        amount: amountOut_asset,
        tokenId: 0,
      };

      const Offer: OfferStruct = {
        takingOfferType: TakingOfferType.BlockOffer,
        offerPrice: OfferPrice,
        specialAddresses: [],
        authorizationAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: now + 200,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc1.getAddress(),
        offerFillType: OfferFillType.NotTaken,
        depositAsset: DepositAssetERC20,
        withdrawalAsset: WithdrawalAssetERC20,
        offer: Offer,
      };

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

      await expect(dotc.connect(acc1).cancelOffer(offerId)).to.be.revertedWithCustomError(
        dotcOfferHelper,
        'OfferInTimelockError',
      );
      await time.increase(300);

      await expect(dotc.connect(acc2).cancelOffer(offerId)).to.be.revertedWithCustomError(
        dotcOfferHelper,
        'OnlyMakerAllowedError',
      );

      const cancel_offer = await dotc.connect(acc1).cancelOffer(offerId);

      await expect(cancel_offer).to.emit(dotc, 'CanceledOffer').withArgs(offerId, DepositAssetERC20.amount);
      await expect(cancel_offer)
        .to.emit(escrow, 'OfferCancelled')
        .withArgs(offerId, await acc1.getAddress(), DepositAssetERC20.amount);

      expect(await erc20_18.balanceOf(escrow.address)).to.eq(0);
      expect(await erc20_18.balanceOf(await acc1.getAddress())).to.eq(DepositAssetERC20.amount);

      expect((await dotc.allOffers(0)).offerFillType).to.eq(OfferFillType.Cancelled);

      expect(await dotc.offersFromAddress(await acc1.getAddress(), 0)).to.eq(offerId);

      expect((await escrow.escrowDeposits(offerId)).depositAsset.assetAddress).to.be.eq(DepositAssetERC20.assetAddress);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.tokenId).to.be.eq(DepositAssetERC20.tokenId);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.assetType).to.be.eq(DepositAssetERC20.assetType);

      expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
        EscrowOfferStatusType.OfferCancelled,
      );

      await expect(dotc.connect(acc1).cancelOffer(2002)).to.be.revertedWithCustomError(
        dotcOfferHelper,
        'OnlyMakerAllowedError',
      );

      await expect(dotc.connect(acc1).updateOffer(offerId, Offer))
        .to.be.revertedWithCustomError(dotcOfferHelper, 'OfferValidityError')
        .withArgs(OfferFillType.Cancelled);
    });

    it('Should cancel partial offer (erc20 => erc20)', async () => {
      const { dotc, escrow, erc20_18, erc20_6, acc1, acc2 } = await loadFixture(fixture);

      const offerId = 0;

      const amountIn = 43;
      const amountOut = 104;

      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));
      const amountOut_asset = BigNumber.from(amountOut).mul(BigNumber.from(10).pow(decimals_6));
      const amountOut_to_take = BigNumber.from(amountOut - 50).mul(BigNumber.from(10).pow(decimals_6));
      const standardized_amountOut_to_take = standardizeNumber(amountOut_to_take, decimals_6);

      await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
      await erc20_6.transfer(await acc2.getAddress(), amountOut_asset);

      await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc20_6.connect(acc2).approve(dotc.address, amountOut_asset);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        assetPrice: AssetPrice,
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_6.address,
        assetPrice: AssetPrice,
        amount: amountOut_asset,
        tokenId: 0,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        assetPrice: AssetPrice,
        amount: standardizeNumber(amountIn_asset, decimals_18),
        tokenId: 0,
      };

      const WithdrawalAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_6.address,
        assetPrice: AssetPrice,
        amount: standardizeNumber(amountOut_asset, decimals_6),
        tokenId: 0,
      };

      const Offer: OfferStruct = {
        takingOfferType: TakingOfferType.PartialOffer,
        offerPrice: OfferPrice,
        specialAddresses: [],
        authorizationAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc1.getAddress(),
        offerFillType: OfferFillType.NotTaken,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC20_standardized,
        offer: Offer,
      };

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

      const cancel_offer = await dotc.connect(acc1).cancelOffer(offerId);

      await expect(cancel_offer).to.emit(dotc, 'CanceledOffer').withArgs(offerId, DepositAssetERC20.amount);
      await expect(cancel_offer)
        .to.emit(escrow, 'OfferCancelled')
        .withArgs(offerId, await acc1.getAddress(), DepositAssetERC20.amount);

      expect(await erc20_18.balanceOf(escrow.address)).to.eq(0);
      expect(await erc20_18.balanceOf(await acc1.getAddress())).to.eq(DepositAssetERC20.amount);

      expect((await dotc.allOffers(0)).offerFillType).to.eq(OfferFillType.Cancelled);

      expect(await dotc.offersFromAddress(await acc1.getAddress(), 0)).to.eq(offerId);

      expect((await escrow.escrowDeposits(offerId)).depositAsset.assetAddress).to.be.eq(DepositAssetERC20.assetAddress);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.tokenId).to.be.eq(DepositAssetERC20.tokenId);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.assetType).to.be.eq(DepositAssetERC20.assetType);

      expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
        EscrowOfferStatusType.OfferCancelled,
      );
    });

    it('Should cancel partial with taken amount offer (erc20 => erc20)', async () => {
      const { dotc, escrow, erc20_18, erc20_6, acc1, acc2 } = await loadFixture(fixture);

      const offerId = 0;

      const amountIn = 43;
      const amountOut = 104;

      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));
      const amountOut_asset = BigNumber.from(amountOut).mul(BigNumber.from(10).pow(decimals_6));
      const amountOut_to_take = BigNumber.from(amountOut - 50).mul(BigNumber.from(10).pow(decimals_6));
      const standardized_amountOut_to_take = standardizeNumber(amountOut_to_take, decimals_6);

      await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
      await erc20_6.transfer(await acc2.getAddress(), amountOut_asset);

      await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc20_6.connect(acc2).approve(dotc.address, amountOut_asset);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        assetPrice: AssetPrice,
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_6.address,
        assetPrice: AssetPrice,
        amount: amountOut_asset,
        tokenId: 0,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        assetPrice: AssetPrice,
        amount: standardizeNumber(amountIn_asset, decimals_18),
        tokenId: 0,
      };

      const WithdrawalAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_6.address,
        assetPrice: AssetPrice,
        amount: standardizeNumber(amountOut_asset, decimals_6),
        tokenId: 0,
      };

      const Offer: OfferStruct = {
        takingOfferType: TakingOfferType.PartialOffer,
        offerPrice: OfferPrice,
        specialAddresses: [],
        authorizationAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc1.getAddress(),
        offerFillType: OfferFillType.Cancelled,
        depositAsset: DepositAssetERC20,
        withdrawalAsset: WithdrawalAssetERC20,
        offer: Offer,
      };

      const unitPrice = BigNumber.from(WithdrawalAssetERC20_standardized.amount)
        .mul(WAD)
        .div(BigNumber.from(DepositAssetERC20_standardized.amount));
      const amountToWitdraw = standardized_amountOut_to_take.mul(WAD).div(BigNumber.from(unitPrice));

      let amountToCancel = BigNumber.from(DepositAssetERC20_standardized.amount).sub(amountToWitdraw);

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

      await dotc.connect(acc2).takeOfferFixed(offerId, amountOut_to_take, addressZero);

      amountToCancel = (await escrow.escrowDeposits(offerId)).depositAsset.amount;

      const cancel_offer = await dotc.connect(acc1).cancelOffer(offerId);

      await expect(cancel_offer).to.emit(dotc, 'CanceledOffer').withArgs(offerId, amountToCancel);
      await expect(cancel_offer)
        .to.emit(escrow, 'OfferCancelled')
        .withArgs(offerId, await acc1.getAddress(), amountToCancel);

      expect(await erc20_18.balanceOf(escrow.address)).to.eq(0);
      expect(await erc20_18.balanceOf(await acc1.getAddress())).to.eq(amountToCancel);

      expect((await dotc.allOffers(0)).offerFillType).to.eq(AwaitingOffer.offerFillType);

      expect(await dotc.offersFromAddress(await acc1.getAddress(), 0)).to.eq(offerId);

      expect((await escrow.escrowDeposits(offerId)).depositAsset.assetAddress).to.be.eq(DepositAssetERC20.assetAddress);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.tokenId).to.be.eq(DepositAssetERC20.tokenId);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.assetType).to.be.eq(DepositAssetERC20.assetType);

      expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
        EscrowOfferStatusType.OfferCancelled,
      );
    });

    it('Should cancel full offer (erc20 => erc721)', async () => {
      const { dotc, escrow, erc20_18, erc721, acc1, acc2, deployer } = await loadFixture(fixture);

      const offerId = 0;

      const amountIn = 43;

      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));

      await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
      await erc721['safeTransferFrom(address,address,uint256)'](
        await deployer.getAddress(),
        await acc2.getAddress(),
        4,
      );

      await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        assetPrice: AssetPrice,
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC721: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        assetPrice: AssetPrice,
        amount: 1,
        tokenId: 4,
      };

      const Offer: OfferStruct = {
        takingOfferType: TakingOfferType.BlockOffer,
        offerPrice: OfferPrice,
        specialAddresses: [],
        authorizationAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc1.getAddress(),
        offerFillType: OfferFillType.NotTaken,
        depositAsset: DepositAssetERC20,
        withdrawalAsset: WithdrawalAssetERC721,
        offer: Offer,
      };

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC721, AwaitingOffer.offer);

      const cancel_offer = await dotc.connect(acc1).cancelOffer(offerId);

      await expect(cancel_offer).to.emit(dotc, 'CanceledOffer').withArgs(offerId, DepositAssetERC20.amount);
      await expect(cancel_offer)
        .to.emit(escrow, 'OfferCancelled')
        .withArgs(offerId, await acc1.getAddress(), DepositAssetERC20.amount);

      expect(await erc20_18.balanceOf(escrow.address)).to.eq(0);
      expect(await erc20_18.balanceOf(await acc1.getAddress())).to.eq(DepositAssetERC20.amount);

      expect((await dotc.allOffers(0)).offerFillType).to.eq(OfferFillType.Cancelled);

      expect(await dotc.offersFromAddress(await acc1.getAddress(), 0)).to.eq(offerId);

      expect((await escrow.escrowDeposits(offerId)).depositAsset.assetAddress).to.be.eq(DepositAssetERC20.assetAddress);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.tokenId).to.be.eq(DepositAssetERC20.tokenId);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.assetType).to.be.eq(DepositAssetERC20.assetType);

      expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
        EscrowOfferStatusType.OfferCancelled,
      );
    });

    it('Should cancel full offer (erc721 => erc20)', async () => {
      const { dotc, escrow, erc20_18, erc721, acc1, acc2, deployer } = await loadFixture(fixture);

      const offerId = 0;

      const amountIn = 43;

      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));

      await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
      await erc721['safeTransferFrom(address,address,uint256)'](
        await deployer.getAddress(),
        await acc2.getAddress(),
        4,
      );

      await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        assetPrice: AssetPrice,
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC721: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        assetPrice: AssetPrice,
        amount: 1,
        tokenId: 4,
      };

      const Offer: OfferStruct = {
        takingOfferType: TakingOfferType.BlockOffer,
        offerPrice: OfferPrice,
        specialAddresses: [],
        authorizationAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc2.getAddress(),
        offerFillType: OfferFillType.NotTaken,
        depositAsset: WithdrawalAssetERC721,
        withdrawalAsset: DepositAssetERC20,
        offer: Offer,
      };

      await dotc.connect(acc2).makeOffer(WithdrawalAssetERC721, DepositAssetERC20, AwaitingOffer.offer);

      const cancel_offer = await dotc.connect(acc2).cancelOffer(offerId);

      await expect(cancel_offer).to.emit(dotc, 'CanceledOffer').withArgs(offerId, WithdrawalAssetERC721.amount);
      await expect(cancel_offer)
        .to.emit(escrow, 'OfferCancelled')
        .withArgs(offerId, await acc2.getAddress(), WithdrawalAssetERC721.amount);

      expect(await erc721.ownerOf(WithdrawalAssetERC721.tokenId)).to.eq(await acc2.getAddress());

      expect((await dotc.allOffers(0)).offerFillType).to.eq(OfferFillType.Cancelled);

      expect(await dotc.offersFromAddress(await acc2.getAddress(), 0)).to.eq(offerId);

      expect((await escrow.escrowDeposits(offerId)).depositAsset.assetAddress).to.be.eq(
        WithdrawalAssetERC721.assetAddress,
      );
      expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.tokenId).to.be.eq(WithdrawalAssetERC721.tokenId);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.assetType).to.be.eq(WithdrawalAssetERC721.assetType);

      expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
        EscrowOfferStatusType.OfferCancelled,
      );
    });

    it('Should cancel full offer (erc20 => erc1155)', async () => {
      const { dotc, escrow, erc20_18, erc1155, acc1, acc2, deployer } = await loadFixture(fixture);

      const offerId = 0;

      const amountIn = 43;

      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));

      await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
      await erc1155.safeTransferFrom(await deployer.getAddress(), await acc2.getAddress(), 3, 202, '0x00');

      await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        assetPrice: AssetPrice,
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        assetPrice: AssetPrice,
        amount: 202,
        tokenId: 3,
      };

      const Offer: OfferStruct = {
        takingOfferType: TakingOfferType.BlockOffer,
        offerPrice: OfferPrice,
        specialAddresses: [],
        authorizationAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc1.getAddress(),
        offerFillType: OfferFillType.NotTaken,
        depositAsset: DepositAssetERC20,
        withdrawalAsset: WithdrawalAssetERC1155,
        offer: Offer,
      };

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC1155, AwaitingOffer.offer);

      const cancel_offer = await dotc.connect(acc1).cancelOffer(offerId);

      await expect(cancel_offer).to.emit(dotc, 'CanceledOffer').withArgs(offerId, DepositAssetERC20.amount);
      await expect(cancel_offer)
        .to.emit(escrow, 'OfferCancelled')
        .withArgs(offerId, await acc1.getAddress(), DepositAssetERC20.amount);

      expect(await erc20_18.balanceOf(escrow.address)).to.eq(0);
      expect(await erc20_18.balanceOf(await acc1.getAddress())).to.eq(DepositAssetERC20.amount);

      expect((await dotc.allOffers(0)).offerFillType).to.eq(OfferFillType.Cancelled);

      expect(await dotc.offersFromAddress(await acc1.getAddress(), 0)).to.eq(offerId);

      expect((await escrow.escrowDeposits(offerId)).depositAsset.assetAddress).to.be.eq(DepositAssetERC20.assetAddress);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.tokenId).to.be.eq(DepositAssetERC20.tokenId);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.assetType).to.be.eq(DepositAssetERC20.assetType);

      expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
        EscrowOfferStatusType.OfferCancelled,
      );
    });

    it('Should cancel full offer (erc1155 => erc20)', async () => {
      const { dotc, escrow, erc20_18, erc1155, acc1, acc2, deployer } = await loadFixture(fixture);

      const offerId = 0;

      const amountIn = 43;

      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));

      await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
      await erc1155.safeTransferFrom(await deployer.getAddress(), await acc2.getAddress(), 3, 202, '0x00');

      await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        assetPrice: AssetPrice,
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        assetPrice: AssetPrice,
        amount: 202,
        tokenId: 3,
      };

      const Offer: OfferStruct = {
        takingOfferType: TakingOfferType.BlockOffer,
        offerPrice: OfferPrice,
        specialAddresses: [],
        authorizationAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc2.getAddress(),
        offerFillType: OfferFillType.NotTaken,
        depositAsset: WithdrawalAssetERC1155,
        withdrawalAsset: DepositAssetERC20,
        offer: Offer,
      };

      await dotc.connect(acc2).makeOffer(WithdrawalAssetERC1155, DepositAssetERC20, AwaitingOffer.offer);

      const cancel_offer = await dotc.connect(acc2).cancelOffer(offerId);

      await expect(cancel_offer).to.emit(dotc, 'CanceledOffer').withArgs(offerId, WithdrawalAssetERC1155.amount);
      await expect(cancel_offer)
        .to.emit(escrow, 'OfferCancelled')
        .withArgs(offerId, await acc2.getAddress(), WithdrawalAssetERC1155.amount);

      expect(await erc1155.balanceOf(escrow.address, WithdrawalAssetERC1155.tokenId)).to.eq(0);
      expect(await erc1155.balanceOf(await acc2.getAddress(), WithdrawalAssetERC1155.tokenId)).to.eq(
        WithdrawalAssetERC1155.amount,
      );

      expect((await dotc.allOffers(0)).offerFillType).to.eq(OfferFillType.Cancelled);

      expect(await dotc.offersFromAddress(await acc2.getAddress(), 0)).to.eq(offerId);

      expect((await escrow.escrowDeposits(offerId)).depositAsset.assetAddress).to.be.eq(
        WithdrawalAssetERC1155.assetAddress,
      );
      expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.tokenId).to.be.eq(WithdrawalAssetERC1155.tokenId);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.assetType).to.be.eq(WithdrawalAssetERC1155.assetType);

      expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
        EscrowOfferStatusType.OfferCancelled,
      );
    });

    it('Should cancel full offer (erc721 => erc721)', async () => {
      const { dotc, escrow, erc721, acc1, acc2, deployer } = await loadFixture(fixture);

      const offerId = 0;

      await erc721['safeTransferFrom(address,address,uint256)'](
        await deployer.getAddress(),
        await acc1.getAddress(),
        2,
      );
      await erc721['safeTransferFrom(address,address,uint256)'](
        await deployer.getAddress(),
        await acc2.getAddress(),
        4,
      );

      await erc721.connect(acc1).setApprovalForAll(dotc.address, true);
      await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC721: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        assetPrice: AssetPrice,
        amount: 1,
        tokenId: 2,
      };

      const WithdrawalAssetERC721: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        assetPrice: AssetPrice,
        amount: 1,
        tokenId: 4,
      };

      const Offer: OfferStruct = {
        takingOfferType: TakingOfferType.BlockOffer,
        offerPrice: OfferPrice,
        specialAddresses: [],
        authorizationAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc1.getAddress(),
        offerFillType: OfferFillType.NotTaken,
        depositAsset: DepositAssetERC721,
        withdrawalAsset: WithdrawalAssetERC721,
        offer: Offer,
      };

      await dotc.connect(acc2).makeOffer(WithdrawalAssetERC721, DepositAssetERC721, AwaitingOffer.offer);

      const cancel_offer = await dotc.connect(acc2).cancelOffer(offerId);

      await expect(cancel_offer).to.emit(dotc, 'CanceledOffer').withArgs(offerId, WithdrawalAssetERC721.amount);
      await expect(cancel_offer)
        .to.emit(escrow, 'OfferCancelled')
        .withArgs(offerId, await acc2.getAddress(), WithdrawalAssetERC721.amount);

      expect(await erc721.ownerOf(WithdrawalAssetERC721.tokenId)).to.eq(await acc2.getAddress());

      expect((await dotc.allOffers(0)).offerFillType).to.eq(OfferFillType.Cancelled);

      expect(await dotc.offersFromAddress(await acc2.getAddress(), 0)).to.eq(offerId);

      expect((await escrow.escrowDeposits(offerId)).depositAsset.assetAddress).to.be.eq(
        WithdrawalAssetERC721.assetAddress,
      );
      expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.tokenId).to.be.eq(WithdrawalAssetERC721.tokenId);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.assetType).to.be.eq(WithdrawalAssetERC721.assetType);

      expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
        EscrowOfferStatusType.OfferCancelled,
      );
    });

    it('Should cancel full offer (erc1155 => erc1155)', async () => {
      const { dotc, escrow, erc1155, acc1, acc2, deployer } = await loadFixture(fixture);

      const offerId = 0;

      await erc1155.safeTransferFrom(await deployer.getAddress(), await acc1.getAddress(), 5, 202, '0x00');
      await erc1155.safeTransferFrom(await deployer.getAddress(), await acc2.getAddress(), 3, 202, '0x00');

      await erc1155.connect(acc1).setApprovalForAll(dotc.address, true);
      await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        assetPrice: AssetPrice,
        amount: 42,
        tokenId: 5,
      };

      const WithdrawalAssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        assetPrice: AssetPrice,
        amount: 202,
        tokenId: 3,
      };

      const Offer: OfferStruct = {
        takingOfferType: TakingOfferType.BlockOffer,
        offerPrice: OfferPrice,
        specialAddresses: [],
        authorizationAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc1.getAddress(),
        offerFillType: OfferFillType.NotTaken,
        depositAsset: DepositAssetERC1155,
        withdrawalAsset: WithdrawalAssetERC1155,
        offer: Offer,
      };

      await dotc.connect(acc2).makeOffer(WithdrawalAssetERC1155, DepositAssetERC1155, AwaitingOffer.offer);

      const cancel_offer = await dotc.connect(acc2).cancelOffer(offerId);

      await expect(cancel_offer).to.emit(dotc, 'CanceledOffer').withArgs(offerId, WithdrawalAssetERC1155.amount);
      await expect(cancel_offer)
        .to.emit(escrow, 'OfferCancelled')
        .withArgs(offerId, await acc2.getAddress(), WithdrawalAssetERC1155.amount);

      expect(await erc1155.balanceOf(escrow.address, WithdrawalAssetERC1155.tokenId)).to.eq(0);
      expect(await erc1155.balanceOf(await acc2.getAddress(), WithdrawalAssetERC1155.tokenId)).to.eq(
        WithdrawalAssetERC1155.amount,
      );

      expect((await dotc.allOffers(0)).offerFillType).to.eq(OfferFillType.Cancelled);

      expect(await dotc.offersFromAddress(await acc2.getAddress(), 0)).to.eq(offerId);

      expect((await escrow.escrowDeposits(offerId)).depositAsset.assetAddress).to.be.eq(
        WithdrawalAssetERC1155.assetAddress,
      );
      expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.tokenId).to.be.eq(WithdrawalAssetERC1155.tokenId);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.assetType).to.be.eq(WithdrawalAssetERC1155.assetType);

      expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(
        EscrowOfferStatusType.OfferCancelled,
      );
    });
  });

  describe('Update Offer', () => {
    it('Should update full offer', async () => {
      const { dotc, dotcOfferHelper, offerHelper, authorization_true, erc20_18, erc20_6, acc1, acc2, acc3, deployer } =
        await loadFixture(fixture);

      const offerId = 0;

      const amountIn = 43;
      const amountOut = 104;

      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));
      const amountOut_asset = BigNumber.from(amountOut).mul(BigNumber.from(10).pow(decimals_6));

      await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
      await erc20_6.transfer(await acc2.getAddress(), amountOut_asset);

      await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc20_6.connect(acc2).approve(dotc.address, amountOut_asset);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        assetPrice: AssetPrice,
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_6.address,
        assetPrice: AssetPrice,
        amount: amountOut_asset,
        tokenId: 0,
      };

      const Offer: OfferStruct = {
        takingOfferType: TakingOfferType.BlockOffer,
        offerPrice: OfferPrice,
        specialAddresses: [],
        authorizationAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: now + 200,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc1.getAddress(),
        offerFillType: OfferFillType.NotTaken,
        depositAsset: DepositAssetERC20,
        withdrawalAsset: WithdrawalAssetERC20,
        offer: Offer,
      };

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

      await expect(dotc.connect(acc1).updateOffer(offerId, Offer)).to.be.revertedWithCustomError(
        dotcOfferHelper,
        'OfferInTimelockError',
      );
      await time.increase(300);

      Offer.expiryTimestamp = 0;
      Offer.timelockPeriod = 0;
      Offer.terms = '';
      Offer.commsLink = '';

      Offer.expiryTimestamp = now + 20000;
      Offer.timelockPeriod = 0;

      const update_offer_2 = await dotc.connect(acc1).updateOffer(offerId, Offer);
      await expect(update_offer_2).to.emit(dotc, 'UpdatedOfferExpiry').withArgs(offerId, Offer.expiryTimestamp);
      expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(Offer.expiryTimestamp);

      Offer.expiryTimestamp = 0;
      Offer.timelockPeriod = now + 300;
      const update_offer_3 = await dotc.connect(acc1).updateOffer(offerId, Offer);
      await expect(update_offer_3).to.emit(dotc, 'UpdatedTimeLockPeriod').withArgs(offerId, Offer.timelockPeriod);
      expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(Offer.timelockPeriod);

      await time.increase(300);

      Offer.terms = 'newTerms';
      Offer.commsLink = 'newCommsLink';
      const update_offer_4 = await dotc.connect(acc1).updateOffer(offerId, Offer);
      await expect(update_offer_4).to.emit(dotc, 'OfferLinksUpdated').withArgs(offerId, Offer.terms, Offer.commsLink);
      expect((await dotc.allOffers(offerId)).offer.terms).to.eq(Offer.terms);
      expect((await dotc.allOffers(offerId)).offer.commsLink).to.eq(Offer.commsLink);

      Offer.timelockPeriod = 0;
      await expect(dotc.connect(acc2).updateOffer(offerId, Offer)).to.be.revertedWithCustomError(
        dotcOfferHelper,
        'OnlyMakerAllowedError',
      );

      await expect(dotc.connect(acc1).updateOffer(2002, Offer)).to.be.revertedWithCustomError(
        dotcOfferHelper,
        'OnlyMakerAllowedError',
      );

      Offer.specialAddresses = [addressZero];
      await expect(dotc.connect(acc1).updateOffer(offerId, Offer))
        .to.be.revertedWithCustomError(offerHelper, 'AddressIsZeroError')
        .withArgs(offerId);

      Offer.specialAddresses = [];
      Offer.authorizationAddresses = [addressZero];
      await expect(dotc.connect(acc1).updateOffer(offerId, Offer))
        .to.be.revertedWithCustomError(offerHelper, 'AddressIsZeroError')
        .withArgs(offerId);

      Offer.authorizationAddresses = [];

      Offer.specialAddresses = [await acc2.getAddress()];
      Offer.expiryTimestamp = now + 2000;
      Offer.timelockPeriod = now + 200;
      const update_offer_5 = await dotc.connect(acc1).updateOffer(offerId, Offer);
      await expect(update_offer_5)
        .to.emit(dotc, 'OfferSpecialAddressesUpdated')
        .withArgs(offerId, Offer.specialAddresses);
      expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq([await acc2.getAddress()]);

      Offer.authorizationAddresses = [authorization_true.address, authorization_true.address];
      const update_offer_6 = await dotc.connect(acc1).updateOffer(offerId, Offer);
      await expect(update_offer_6)
        .to.emit(dotc, 'OfferAuthAddressesUpdated')
        .withArgs(offerId, Offer.authorizationAddresses);
      expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq([await acc2.getAddress()]);

      await expect(dotc.connect(deployer).takeOfferFixed(offerId, 0, addressZero))
        .to.be.revertedWithCustomError(offerHelper, 'NotSpecialAddressError')
        .withArgs(await deployer.getAddress());
      await expect(dotc.connect(acc3).takeOfferFixed(offerId, 0, addressZero))
        .to.be.revertedWithCustomError(offerHelper, 'NotSpecialAddressError')
        .withArgs(await acc3.getAddress());

      await dotc.connect(acc2).takeOfferFixed(offerId, 0, addressZero);
    });
  });
});

function standardizeNumber(amount: BigNumber, decimals: number) {
  const dec = BigNumber.from(10).pow(decimals);
  return amount.mul(WAD).div(dec);
}

function unstandardizeNumber(amount: BigNumber, decimals: number) {
  const dec = BigNumber.from(10).pow(decimals);
  return dec.mul(amount).div(WAD);
}

function getPartPercentage(part: BigNumber, whole: BigNumber): BigNumber {
  return part.mul(SCALING_FACTOR).div(whole);
}

function calculatePercentage(value: BigNumber, percentage: BigNumber): BigNumber {
  return value.mul(percentage).div(SCALING_FACTOR);
}

function getRateWithPercentage(rate: BigNumber, offerPrice: OfferPriceStruct): BigNumber {
  const percentage = calculatePercentage(rate, BigNumber.from(offerPrice.percentage));

  return offerPrice.percentageType == PercentageType.Plus ? rate.add(percentage) : rate.sub(percentage);
}
