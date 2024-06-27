import { ethers, upgrades } from 'hardhat';
import { BigNumber, ContractFactory, Signer } from 'ethers';
import { expect } from 'chai';
import {
  DotcEscrowV3 as DotcEscrow,
  DotcV3 as Dotc,
  ERC20MockV3,
  ERC721MockV3,
  ERC1155MockV3,
  AssetHelper,
  DotcOfferHelper,
  OfferHelper
} from '../../../typechain';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import {
  AssetStruct,
  DotcOfferStruct,
  PriceStruct,
  OfferStruct,
  AssetType,
  EscrowCallType,
  TakingOfferType,
  ValidityType,
  OfferPricingType
} from '../../helpers/StructuresV3';

describe.only('OpenDotcV3', () => {
  const addressZero = ethers.constants.AddressZero;
  const terms = 'terms';
  const commsLink = 'commsLink';

  let decimals_18: number, decimals_6: number;

  let now: number;

  async function fixture() {
    const [deployer, acc1, acc2, acc3, otherAcc]: Signer[] = await ethers.getSigners();


    // Deploy AssetHelper library
    const AssetHelper: ContractFactory = await ethers.getContractFactory('AssetHelper');
    const assetHelper = await AssetHelper.deploy() as AssetHelper;
    await assetHelper.deployed();

    // Deploy DotcOfferHelper library
    const OfferHelper: ContractFactory = await ethers.getContractFactory('OfferHelper', {
      libraries: {
        AssetHelper: assetHelper.address,
      },
    });
    const offerHelper = await OfferHelper.deploy() as OfferHelper;
    await offerHelper.deployed();

    // Deploy DotcOfferHelper library
    const DotcOfferHelper: ContractFactory = await ethers.getContractFactory('DotcOfferHelper');
    const dotcOfferHelper = await DotcOfferHelper.deploy() as DotcOfferHelper;
    await dotcOfferHelper.deployed();

    const DotcEscrow: ContractFactory = await ethers.getContractFactory('DotcEscrowV3', {
      libraries: {
        AssetHelper: assetHelper.address,
      },
    });
    const escrow = await upgrades.deployProxy(DotcEscrow, [await deployer.getAddress()], { unsafeAllowLinkedLibraries: true }) as DotcEscrow;
    await escrow.deployed();

    const Dotc = await ethers.getContractFactory('DotcV3', {
      libraries: {
        AssetHelper: assetHelper.address,
        OfferHelper: offerHelper.address,
        DotcOfferHelper: dotcOfferHelper.address,
      },
    });
    const dotc = await upgrades.deployProxy(Dotc, [escrow.address], { unsafeAllowLinkedLibraries: true }) as Dotc;
    await dotc.deployed();

    const ERC20: ContractFactory = await ethers.getContractFactory('ERC20MockV3');
    const erc20_18: ERC20MockV3 = (await ERC20.deploy(18)) as ERC20MockV3;
    await erc20_18.deployed();
    const erc20_6: ERC20MockV3 = (await ERC20.deploy(6)) as ERC20MockV3;
    await erc20_6.deployed();

    const ERC721: ContractFactory = await ethers.getContractFactory('ERC721MockV3');
    const erc721: ERC721MockV3 = (await ERC721.deploy()) as ERC721MockV3;
    await erc721.deployed();
    const ERC1155: ContractFactory = await ethers.getContractFactory('ERC1155MockV3');
    const erc1155: ERC1155MockV3 = (await ERC1155.deploy()) as ERC1155MockV3;
    await erc1155.deployed();

    await escrow.changeDotc(dotc.address);

    decimals_18 = await erc20_18.decimals();
    decimals_6 = await erc20_6.decimals();
    now = await time.latest();

    return {
      deployer,
      acc1,
      acc2,
      acc3,
      otherAcc,
      dotc,
      escrow,
      erc20_18,
      erc20_6,
      erc721,
      erc1155,
      assetHelper,
      offerHelper,
      dotcOfferHelper
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

      await expect(escrow.initialize(dotc.address)).to.be.revertedWithCustomError(
        escrow,
        'InvalidInitialization',
      );
      await expect(dotc.initialize(escrow.address)).to.be.revertedWithCustomError(dotc, 'InvalidInitialization');
    });

    it('Should support interface', async () => {
      const { dotc, escrow } = await loadFixture(fixture);

      const IERC165_interface = '0x01ffc9a7';

      expect(await dotc.supportsInterface(IERC165_interface)).to.be.true;

      expect(await escrow.supportsInterface(IERC165_interface)).to.be.true;
    });
  });

  describe('Make offer', () => {
    it('Should make full offer (erc20 => erc20)', async () => {
      const { dotc, escrow, offerHelper, assetHelper, erc20_18, erc20_6, erc721, acc1, acc2, otherAcc } = await loadFixture(
        fixture,
      );

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
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_6.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: amountOut_asset,
        tokenId: 0,
      };

      const Price: PriceStruct = {
        unitPrice: 0,
        min: 0,
        max: 0,
        percentage: 0
      }

      const Offer: OfferStruct = {
        takingOfferType: TakingOfferType.FullyTaking,
        offerPricingType: OfferPricingType.FixedPricing,
        price: Price,
        specialAddresses: [],
        authorizationAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc1.getAddress(),
        validityType: ValidityType.NotTaken,
        depositAsset: DepositAssetERC20,
        withdrawalAsset: WithdrawalAssetERC20,
        offer: Offer,
      };

      const unitPrice = BigNumber.from(WithdrawalAssetERC20.amount)
        .mul(BigNumber.from(10).pow(decimals_18))
        .div(BigNumber.from(DepositAssetERC20.amount));

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

      expect((await dotc.getOffer(0)).offer.takingOfferType).to.eq(AwaitingOffer.offer.takingOfferType);
      expect((await dotc.getOffer(0)).maker).to.eq(AwaitingOffer.maker);
      expect((await dotc.getOffer(0)).validityType).to.eq(AwaitingOffer.validityType);
      expect((await dotc.getOffer(0)).offer.price.unitPrice).to.eq(unitPrice);
      expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq(AwaitingOffer.offer.specialAddresses);
      expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(AwaitingOffer.offer.expiryTimestamp);
      expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(AwaitingOffer.offer.timelockPeriod);
      expect((await dotc.allOffers(0)).offer.terms).to.eq(AwaitingOffer.offer.terms);
      expect((await dotc.allOffers(0)).offer.commsLink).to.eq(AwaitingOffer.offer.commsLink);

      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(DepositAssetERC20.amount);
      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(DepositAssetERC20.assetAddress);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(DepositAssetERC20.assetType);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(DepositAssetERC20.tokenId);

      expect(await dotc.getOffersFromAddress(await acc1.getAddress())).to.deep.eq([0]);
      expect(await dotc.getOfferOwner(0)).to.eq(await acc1.getAddress());

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
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 1,
        tokenId: 4,
      };

      Offer.takingOfferType = TakingOfferType.PartialTaking;
      Offer.timelockPeriod = 0;

      await erc20_18.approve(dotc.address, ethers.utils.parseEther('1000000'));

      await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC721_false, Offer)).to.be.revertedWithCustomError(
        offerHelper,
        'UnsupportedPartialOfferForNonERC20AssetsError',
      );

      await expect(dotc.makeOffer(WithdrawalAssetERC721_false, DepositAssetERC20, Offer)).to.be.revertedWithCustomError(
        offerHelper,
        'UnsupportedPartialOfferForNonERC20AssetsError',
      );

      let DepositAssetERC20_false: AssetStruct = {
        assetType: 0,
        assetAddress: erc20_18.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: amountIn_asset,
        tokenId: 0,
      };

      Offer.takingOfferType = TakingOfferType.FullyTaking;

      await expect(dotc.makeOffer(DepositAssetERC20_false, WithdrawalAssetERC20, Offer)).to.be.revertedWithCustomError(
        assetHelper,
        'AssetTypeUndefinedError',
      );

      DepositAssetERC20_false = {
        assetType: 1,
        assetAddress: addressZero,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: amountIn_asset,
        tokenId: 0,
      };

      await expect(dotc.makeOffer(DepositAssetERC20_false, WithdrawalAssetERC20, Offer)).to.be.revertedWithCustomError(
        assetHelper,
        'AssetAddressIsZeroError',
      );

      DepositAssetERC20_false = {
        assetType: 1,
        assetAddress: erc20_18.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 0,
        tokenId: 0,
      };

      await expect(dotc.makeOffer(DepositAssetERC20_false, WithdrawalAssetERC20, Offer)).to.be.revertedWithCustomError(
        assetHelper,
        'AssetAmountIsZeroError',
      );

      let WithdrawalAssetERC20_false: AssetStruct = {
        assetType: 0,
        assetAddress: erc20_6.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: amountOut_asset,
        tokenId: 0,
      };

      await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20_false, Offer)).to.be.revertedWithCustomError(
        assetHelper,
        'AssetTypeUndefinedError',
      );

      WithdrawalAssetERC20_false = {
        assetType: 1,
        assetAddress: addressZero,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: amountOut_asset,
        tokenId: 0,
      };

      await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20_false, Offer)).to.be.revertedWithCustomError(
        assetHelper,
        'AssetAddressIsZeroError',
      );

      WithdrawalAssetERC20_false = {
        assetType: 1,
        assetAddress: erc20_6.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 0,
        tokenId: 0,
      };

      await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20_false, Offer)).to.be.revertedWithCustomError(
        assetHelper,
        'AssetAmountIsZeroError',
      );

      Offer.specialAddresses = [addressZero];
      await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20, Offer)).to.be.revertedWithCustomError(
        offerHelper,
        'SpecialAddressIsZeroError',
      );
      Offer.specialAddresses = [await acc1.getAddress(), addressZero, await acc2.getAddress()];
      await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20, Offer)).to.be.revertedWithCustomError(
        offerHelper,
        'SpecialAddressIsZeroError',
      );

      Offer.specialAddresses = [];

      Offer.authorizationAddresses = [addressZero];
      await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20, Offer)).to.be.revertedWithCustomError(
        offerHelper,
        'AuthAddressIsZeroError',
      );
      Offer.authorizationAddresses = [await acc1.getAddress(), addressZero, await acc2.getAddress()];
      await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20, Offer)).to.be.revertedWithCustomError(
        offerHelper,
        'AuthAddressIsZeroError',
      );
    });

    it('Should make partial offer (erc20 => erc20)', async () => {
      const { dotc, escrow, erc20_18, erc20_6, acc1, acc2, otherAcc } = await loadFixture(fixture);

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
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_6.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: amountOut_asset,
        tokenId: 0,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: standardizeNumber(amountIn_asset, decimals_18),
        tokenId: 0,
      };

      const WithdrawalAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_6.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: standardizeNumber(amountOut_asset, decimals_6),
        tokenId: 0,
      };

      const Price: PriceStruct = {
        unitPrice: 0,
        min: 0,
        max: 0,
        percentage: 0
      }

      const Offer: OfferStruct = {
        takingOfferType: TakingOfferType.PartialTaking,
        offerPricingType: OfferPricingType.FixedPricing,
        price: Price,
        specialAddresses: [],
        authorizationAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc1.getAddress(),
        validityType: ValidityType.NotTaken,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC20_standardized,
        offer: Offer,
      };

      const unitPrice = BigNumber.from(WithdrawalAssetERC20_standardized.amount)
        .mul(BigNumber.from(10).pow(decimals_18))
        .div(BigNumber.from(DepositAssetERC20_standardized.amount))

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
      expect((await dotc.allOffers(0)).validityType).to.eq(AwaitingOffer.validityType);

      expect((await dotc.allOffers(0)).offer.price.unitPrice).to.eq(unitPrice);
      expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq(AwaitingOffer.offer.specialAddresses);
      expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(AwaitingOffer.offer.expiryTimestamp);
      expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(AwaitingOffer.offer.timelockPeriod);
      expect((await dotc.allOffers(0)).offer.terms).to.eq(AwaitingOffer.offer.terms);
      expect((await dotc.allOffers(0)).offer.commsLink).to.eq(AwaitingOffer.offer.commsLink);

      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(DepositAssetERC20.amount);
      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(DepositAssetERC20.assetAddress);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(DepositAssetERC20.assetType);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(DepositAssetERC20.tokenId);
    });

    it('Should make full offer (erc20 => erc721)', async () => {
      const { dotc, escrow, erc20_18, erc721, acc1, acc2, deployer, otherAcc } = await loadFixture(fixture);

      const offerId = 0;

      const amountIn = 43;

      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));

      await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
      await erc721['safeTransferFrom(address,address,uint256)'](await deployer.getAddress(), await acc2.getAddress(), 4);

      await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC721: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 1,
        tokenId: 4,
      };

      const Price: PriceStruct = {
        unitPrice: 0,
        min: 0,
        max: 0,
        percentage: 0
      }

      const Offer: OfferStruct = {
        takingOfferType: TakingOfferType.FullyTaking,
        offerPricingType: OfferPricingType.FixedPricing,
        price: Price,
        specialAddresses: [],
        authorizationAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc1.getAddress(),
        validityType: ValidityType.NotTaken,
        depositAsset: DepositAssetERC20,
        withdrawalAsset: WithdrawalAssetERC721,
        offer: Offer,
      };

      const unitPrice = BigNumber.from(WithdrawalAssetERC721.amount)
        .mul(BigNumber.from(10).pow(decimals_18))
        .div(BigNumber.from(DepositAssetERC20.amount));

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
      expect((await dotc.allOffers(0)).validityType).to.eq(AwaitingOffer.validityType);
      expect((await dotc.allOffers(0)).offer.price.unitPrice).to.eq(unitPrice);
      expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq(AwaitingOffer.offer.specialAddresses);
      expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(AwaitingOffer.offer.expiryTimestamp);
      expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(AwaitingOffer.offer.timelockPeriod);
      expect((await dotc.allOffers(0)).offer.terms).to.eq(AwaitingOffer.offer.terms);
      expect((await dotc.allOffers(0)).offer.commsLink).to.eq(AwaitingOffer.offer.commsLink);

      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(DepositAssetERC20.amount);
      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(DepositAssetERC20.assetAddress);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(DepositAssetERC20.assetType);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(DepositAssetERC20.tokenId);
    });

    it('Should make full offer (erc721 => erc20)', async () => {
      const { dotc, escrow, erc20_18, erc721, acc1, acc2, deployer, otherAcc } = await loadFixture(fixture);

      const offerId = 0;

      const amountIn = 43;

      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));

      await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
      await erc721['safeTransferFrom(address,address,uint256)'](await deployer.getAddress(), await acc2.getAddress(), 4);

      await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC721: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 1,
        tokenId: 4,
      };

      const Price: PriceStruct = {
        unitPrice: 0,
        min: 0,
        max: 0,
        percentage: 0
      }

      const Offer: OfferStruct = {
        takingOfferType: TakingOfferType.FullyTaking,
        offerPricingType: OfferPricingType.FixedPricing,
        price: Price,
        specialAddresses: [],
        authorizationAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc2.getAddress(),
        validityType: ValidityType.NotTaken,
        depositAsset: WithdrawalAssetERC721,
        withdrawalAsset: DepositAssetERC20,
        offer: Offer,
      };

      const unitPrice = BigNumber.from(DepositAssetERC20.amount)
        .mul(BigNumber.from(10).pow(decimals_18))
        .div(BigNumber.from(WithdrawalAssetERC721.amount));

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
      expect((await dotc.allOffers(0)).validityType).to.eq(AwaitingOffer.validityType);
      expect((await dotc.allOffers(0)).offer.price.unitPrice).to.eq(unitPrice);
      expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq(AwaitingOffer.offer.specialAddresses);
      expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(AwaitingOffer.offer.expiryTimestamp);
      expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(AwaitingOffer.offer.timelockPeriod);
      expect((await dotc.allOffers(0)).offer.terms).to.eq(AwaitingOffer.offer.terms);
      expect((await dotc.allOffers(0)).offer.commsLink).to.eq(AwaitingOffer.offer.commsLink);

      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(WithdrawalAssetERC721.amount);
      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(WithdrawalAssetERC721.assetAddress);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(WithdrawalAssetERC721.assetType);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(WithdrawalAssetERC721.tokenId);
    });

    it('Should make full offer (erc20 => erc1155)', async () => {
      const { dotc, escrow, erc20_18, erc1155, acc1, acc2, deployer, otherAcc } = await loadFixture(fixture);

      let offerId = 0;

      const amountIn = 43;

      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));

      await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
      await erc1155.safeTransferFrom(await deployer.getAddress(), await acc2.getAddress(), 3, 202, '0x00');

      await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 202,
        tokenId: 3,
      };

      const Price: PriceStruct = {
        unitPrice: 0,
        min: 0,
        max: 0,
        percentage: 0
      }

      const Offer: OfferStruct = {
        takingOfferType: TakingOfferType.FullyTaking,
        offerPricingType: OfferPricingType.FixedPricing,
        price: Price,
        specialAddresses: [],
        authorizationAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc1.getAddress(),
        validityType: ValidityType.NotTaken,
        depositAsset: DepositAssetERC20,
        withdrawalAsset: WithdrawalAssetERC1155,
        offer: Offer,
      };

      const unitPrice = BigNumber.from(WithdrawalAssetERC1155.amount)
        .mul(BigNumber.from(10).pow(decimals_18))
        .div(BigNumber.from(DepositAssetERC20.amount))

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
      expect((await dotc.allOffers(0)).validityType).to.eq(AwaitingOffer.validityType);
      expect((await dotc.allOffers(0)).offer.price.unitPrice).to.eq(unitPrice);
      expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq(AwaitingOffer.offer.specialAddresses);
      expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(AwaitingOffer.offer.expiryTimestamp);
      expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(AwaitingOffer.offer.timelockPeriod);
      expect((await dotc.allOffers(0)).offer.terms).to.eq(AwaitingOffer.offer.terms);
      expect((await dotc.allOffers(0)).offer.commsLink).to.eq(AwaitingOffer.offer.commsLink);

      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(DepositAssetERC20.amount);
      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(DepositAssetERC20.assetAddress);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(DepositAssetERC20.assetType);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(DepositAssetERC20.tokenId);

      offerId++;
    });

    it('Should make full offer (erc1155 => erc20)', async () => {
      const { dotc, escrow, erc20_18, erc1155, acc1, acc2, deployer, otherAcc } = await loadFixture(fixture);

      let offerId = 0;

      const amountIn = 43;

      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));

      await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
      await erc1155.safeTransferFrom(await deployer.getAddress(), await acc2.getAddress(), 3, 202, '0x00');

      await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 202,
        tokenId: 3,
      };

      const Price: PriceStruct = {
        unitPrice: 0,
        min: 0,
        max: 0,
        percentage: 0
      }

      const Offer: OfferStruct = {
        takingOfferType: TakingOfferType.FullyTaking,
        offerPricingType: OfferPricingType.FixedPricing,
        price: Price,
        specialAddresses: [],
        authorizationAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc2.getAddress(),
        validityType: ValidityType.NotTaken,
        depositAsset: WithdrawalAssetERC1155,
        withdrawalAsset: DepositAssetERC20,
        offer: Offer,
      };

      const unitPrice = BigNumber.from(DepositAssetERC20.amount)
        .mul(BigNumber.from(10).pow(decimals_18))
        .div(BigNumber.from(WithdrawalAssetERC1155.amount))

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
      expect((await dotc.allOffers(0)).validityType).to.eq(AwaitingOffer.validityType);
      expect((await dotc.allOffers(0)).offer.price.unitPrice).to.eq(unitPrice);
      expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq(AwaitingOffer.offer.specialAddresses);
      expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(AwaitingOffer.offer.expiryTimestamp);
      expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(AwaitingOffer.offer.timelockPeriod);
      expect((await dotc.allOffers(0)).offer.terms).to.eq(AwaitingOffer.offer.terms);
      expect((await dotc.allOffers(0)).offer.commsLink).to.eq(AwaitingOffer.offer.commsLink);

      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(WithdrawalAssetERC1155.amount);
      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(WithdrawalAssetERC1155.assetAddress);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(WithdrawalAssetERC1155.assetType);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(WithdrawalAssetERC1155.tokenId);

      offerId++;
    });

    it('Should make full offer (erc721 => erc721)', async () => {
      const { dotc, escrow, erc721, acc1, acc2, deployer, otherAcc } = await loadFixture(fixture);

      let offerId = 0;

      await erc721['safeTransferFrom(address,address,uint256)'](await deployer.getAddress(), await acc1.getAddress(), 2);
      await erc721['safeTransferFrom(address,address,uint256)'](await deployer.getAddress(), await acc2.getAddress(), 4);

      await erc721.connect(acc1).setApprovalForAll(dotc.address, true);
      await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC721: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 1,
        tokenId: 2,
      };

      const WithdrawalAssetERC721: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 1,
        tokenId: 4,
      };

      const Price: PriceStruct = {
        unitPrice: 0,
        min: 0,
        max: 0,
        percentage: 0
      }

      const Offer: OfferStruct = {
        takingOfferType: TakingOfferType.FullyTaking,
        offerPricingType: OfferPricingType.FixedPricing,
        price: Price,
        specialAddresses: [],
        authorizationAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc1.getAddress(),
        validityType: ValidityType.NotTaken,
        depositAsset: DepositAssetERC721,
        withdrawalAsset: WithdrawalAssetERC721,
        offer: Offer,
      };

      const unitPrice = BigNumber.from(WithdrawalAssetERC721.amount)
        .mul(ethers.utils.parseEther('1'))
        .div(BigNumber.from(DepositAssetERC721.amount));

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
      expect((await dotc.allOffers(0)).validityType).to.eq(AwaitingOffer.validityType);
      expect((await dotc.allOffers(0)).offer.price.unitPrice).to.eq(unitPrice);
      expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq(AwaitingOffer.offer.specialAddresses);
      expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(AwaitingOffer.offer.expiryTimestamp);
      expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(AwaitingOffer.offer.timelockPeriod);
      expect((await dotc.allOffers(0)).offer.terms).to.eq(AwaitingOffer.offer.terms);
      expect((await dotc.allOffers(0)).offer.commsLink).to.eq(AwaitingOffer.offer.commsLink);

      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(DepositAssetERC721.amount);
      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(DepositAssetERC721.assetAddress);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(DepositAssetERC721.assetType);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(DepositAssetERC721.tokenId);

      offerId++;
    });

    it('Should make full offer (erc1155 => erc1155)', async () => {
      const { dotc, escrow, erc1155, acc1, acc2, deployer, otherAcc } = await loadFixture(fixture);

      let offerId = 0;

      await erc1155.safeTransferFrom(await deployer.getAddress(), await acc1.getAddress(), 5, 202, '0x00');
      await erc1155.safeTransferFrom(await deployer.getAddress(), await acc2.getAddress(), 3, 202, '0x00');

      await erc1155.connect(acc1).setApprovalForAll(dotc.address, true);
      await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 42,
        tokenId: 5,
      };

      const WithdrawalAssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 202,
        tokenId: 3,
      };

      const Price: PriceStruct = {
        unitPrice: 0,
        min: 0,
        max: 0,
        percentage: 0
      }

      const Offer: OfferStruct = {
        takingOfferType: TakingOfferType.FullyTaking,
        offerPricingType: OfferPricingType.FixedPricing,
        price: Price,
        specialAddresses: [],
        authorizationAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc1.getAddress(),
        validityType: ValidityType.NotTaken,
        depositAsset: DepositAssetERC1155,
        withdrawalAsset: WithdrawalAssetERC1155,
        offer: Offer,
      };

      const unitPrice = BigNumber.from(WithdrawalAssetERC1155.amount)
        .mul(ethers.utils.parseEther('1'))
        .div(BigNumber.from(DepositAssetERC1155.amount))

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
      expect((await dotc.allOffers(0)).validityType).to.eq(AwaitingOffer.validityType);
      expect((await dotc.allOffers(0)).offer.price.unitPrice).to.eq(unitPrice);
      expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq(AwaitingOffer.offer.specialAddresses);
      expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(AwaitingOffer.offer.expiryTimestamp);
      expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(AwaitingOffer.offer.timelockPeriod);
      expect((await dotc.allOffers(0)).offer.terms).to.eq(AwaitingOffer.offer.terms);
      expect((await dotc.allOffers(0)).offer.commsLink).to.eq(AwaitingOffer.offer.commsLink);

      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(DepositAssetERC1155.amount);
      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(DepositAssetERC1155.assetAddress);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(DepositAssetERC1155.assetType);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(DepositAssetERC1155.tokenId);

      offerId++;
    });

    it('Should not revert making offer', async () => {
      const { dotc, assetHelper, erc20_18, erc20_6, erc721, acc1, acc2, otherAcc } = await loadFixture(fixture);

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
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_6.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: amountOut_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC721_false: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 204,
        tokenId: 4,
      };

      let DepositAssetERC20_false: AssetStruct = {
        assetType: 0,
        assetAddress: erc20_18.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: amountIn_asset,
        tokenId: 0,
      };

      let WithdrawalAssetERC20_false: AssetStruct = {
        assetType: 0,
        assetAddress: erc20_6.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: amountOut_asset,
        tokenId: 0,
      };

      const Price: PriceStruct = {
        unitPrice: 0,
        min: 0,
        max: 0,
        percentage: 0
      }

      const Offer: OfferStruct = {
        takingOfferType: TakingOfferType.FullyTaking,
        offerPricingType: OfferPricingType.FixedPricing,
        price: Price,
        specialAddresses: [],
        authorizationAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      await expect(dotc.makeOffer(DepositAssetERC20_false, WithdrawalAssetERC20, Offer)).to.be.revertedWithCustomError(
        assetHelper,
        'AssetTypeUndefinedError',
      );

      DepositAssetERC20_false = {
        assetType: 1,
        assetAddress: addressZero,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: amountIn_asset,
        tokenId: 0,
      };

      await expect(dotc.makeOffer(DepositAssetERC20_false, WithdrawalAssetERC20, Offer)).to.be.revertedWithCustomError(
        assetHelper,
        'AssetAddressIsZeroError',
      );

      DepositAssetERC20_false = {
        assetType: 1,
        assetAddress: erc20_18.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 0,
        tokenId: 0,
      };

      await expect(dotc.makeOffer(DepositAssetERC20_false, WithdrawalAssetERC20, Offer)).to.be.revertedWithCustomError(
        assetHelper,
        'AssetAmountIsZeroError',
      );

      await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20_false, Offer)).to.be.revertedWithCustomError(
        assetHelper,
        'AssetTypeUndefinedError',
      );

      WithdrawalAssetERC20_false = {
        assetType: 1,
        assetAddress: addressZero,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: amountOut_asset,
        tokenId: 0,
      };

      await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20_false, Offer)).to.be.revertedWithCustomError(
        assetHelper,
        'AssetAddressIsZeroError',
      );

      WithdrawalAssetERC20_false = {
        assetType: 1,
        assetAddress: erc20_6.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 0,
        tokenId: 0,
      };

      await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20_false, Offer)).to.be.revertedWithCustomError(
        assetHelper,
        'AssetAmountIsZeroError',
      );

      await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC721_false, Offer)).to.be.revertedWithCustomError(
        assetHelper,
        'ERC721AmountExceedsOneError',
      );
      await expect(dotc.makeOffer(WithdrawalAssetERC721_false, DepositAssetERC20, Offer)).to.be.revertedWithCustomError(
        assetHelper,
        'ERC721AmountExceedsOneError',
      );
    });

    it('Check error', async () => {
      const { dotc, erc20_18, erc20_6, acc1, otherAcc } = await loadFixture(fixture);

      const deposit: AssetStruct = {
        assetType: AssetType.ERC20,
        assetAddress: erc20_6.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 1000000,
        tokenId: 1,
      };

      const withdraw: AssetStruct = {
        assetType: AssetType.ERC20,
        assetAddress: erc20_18.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: BigNumber.from('4000000000000000000'),
        tokenId: 1,
      };


      const Price: PriceStruct = {
        unitPrice: 0,
        min: 0,
        max: 0,
        percentage: 0
      }

      const offer: OfferStruct = {
        takingOfferType: TakingOfferType.PartialTaking,
        offerPricingType: OfferPricingType.FixedPricing,
        price: Price,
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

  describe.only('Take Offer', () => {
    it('Should take full offer (erc20 => erc20)', async () => {
      const { dotc, escrow, assetHelper, offerHelper, dotcOfferHelper, erc20_18, erc20_6, acc1, acc2, acc3, deployer, otherAcc } =
        await loadFixture(fixture);

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
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_6.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: amountOut_asset,
        tokenId: 0,
      };

      const Price: PriceStruct = {
        unitPrice: 0,
        min: 0,
        max: 0,
        percentage: 0
      }

      const Offer: OfferStruct = {
        takingOfferType: TakingOfferType.FullyTaking,
        offerPricingType: OfferPricingType.FixedPricing,
        price: Price,
        specialAddresses: [await acc2.getAddress(), await deployer.getAddress()],
        authorizationAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc1.getAddress(),
        validityType: ValidityType.FullyTaken,
        depositAsset: DepositAssetERC20,
        withdrawalAsset: WithdrawalAssetERC20,
        offer: Offer,
      };

      const fees = BigNumber.from(WithdrawalAssetERC20.amount)
        .mul(await escrow.feeAmount())
        .div(await assetHelper.BPS());
      const deployerBalance_2 = await erc20_6.balanceOf(await deployer.getAddress());

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

      await expect(dotc.connect(acc3).takeFullOffer(offerId)).to.be.revertedWithCustomError(
        offerHelper,
        'NotSpecialAddressError',
      );
      // Checks if threw another message (that is lower in hirarchy) than 'Dotc: Only Special addresses allowed to take offer' then special addresses works correctly
      await expect(dotc.connect(deployer).takeFullOffer(offerId)).to.be.revertedWithCustomError(
        erc20_6,
        'ERC20InsufficientAllowance',
      );

      const take_offer = await dotc.connect(acc2).takeFullOffer(offerId);

      const feeAmount = BigNumber.from(WithdrawalAssetERC20.amount).mul(await escrow.feeAmount()).div(await assetHelper.BPS())
      const paid = BigNumber.from(WithdrawalAssetERC20.amount).sub(feeAmount);

      await expect(take_offer)
        .to.emit(dotc, 'TakenOffer')
        .withArgs(offerId, await acc2.getAddress(), AwaitingOffer.validityType, DepositAssetERC20.amount, paid);
      await expect(take_offer)
        .to.emit(escrow, 'OfferWithdrawn')
        .withArgs(offerId, await acc2.getAddress(), DepositAssetERC20.amount);

      expect(await erc20_18.balanceOf(escrow.address)).to.eq(0);
      expect(await erc20_18.balanceOf(await acc2.getAddress())).to.eq(DepositAssetERC20.amount);
      expect(await erc20_6.balanceOf(await acc1.getAddress())).to.eq(BigNumber.from(WithdrawalAssetERC20.amount).sub(fees));
      expect(await erc20_6.balanceOf(await deployer.getAddress())).to.eq(BigNumber.from(deployerBalance_2).add(fees));

      expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
      expect((await dotc.allOffers(0)).validityType).to.eq(AwaitingOffer.validityType);

      expect(await dotc.offersFromAddress(await acc1.getAddress(), 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);

      await expect(dotc.connect(acc2).takeFullOffer(50)).to.be.revertedWithCustomError(
        dotcOfferHelper,
        'OfferValidityError',
      );
      await expect(dotc.connect(acc2).takeFullOffer(offerId)).to.be.revertedWithCustomError(
        dotcOfferHelper,
        'OfferValidityError',
      );

      await expect(dotc.connect(acc1).updateOffer(offerId, 0, Offer)).to.be.revertedWithCustomError(
        dotcOfferHelper,
        'OfferValidityError',
      );
      await expect(dotc.connect(acc1).cancelOffer(offerId)).to.be.revertedWithCustomError(dotcOfferHelper, 'OfferValidityError');

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

      await expect(dotc.connect(acc2).takeFullOffer(offerId)).to.be.revertedWithCustomError(
        offerHelper,
        'OfferExpiredError',
      );
    });

    it('Should take partial offer (erc20 => erc20)', async () => {
      const { dotc, escrow, assetHelper, offerHelper, erc20_18, erc20_6, acc1, acc2, deployer, otherAcc } = await loadFixture(fixture);

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
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_6.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: amountOut_asset,
        tokenId: 0,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: standardizeNumber(amountIn_asset, decimals_18),
        tokenId: 0,
      };

      const WithdrawalAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_6.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: standardizeNumber(amountOut_asset, decimals_6),
        tokenId: 0,
      };

      const Price: PriceStruct = {
        unitPrice: 0,
        min: 0,
        max: 0,
        percentage: 0
      }

      const Offer: OfferStruct = {
        takingOfferType: TakingOfferType.PartialTaking,
        offerPricingType: OfferPricingType.FixedPricing,
        price: Price,
        specialAddresses: [],
        authorizationAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc1.getAddress(),
        validityType: ValidityType.NotTaken,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC20_standardized,
        offer: Offer,
      };

      const unitPrice = BigNumber.from(WithdrawalAssetERC20_standardized.amount)
        .mul(BigNumber.from(10).pow(decimals_18))
        .div(BigNumber.from(DepositAssetERC20_standardized.amount));

      const fees = BigNumber.from(amountOut_to_take)
        .mul(await escrow.feeAmount())
        .div(await assetHelper.BPS());
      const deployerBalance_2 = await erc20_6.balanceOf(await deployer.getAddress());

      const amountToWithdraw = standardized_amountOut_to_take
        .mul(BigNumber.from(10).pow(await offerHelper.DECIMALS()))
        .div(unitPrice);

      const realAmount = unstandardizeNumber(amountToWithdraw, await erc20_18.decimals());

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

      const balance = await erc20_18.balanceOf(escrow.address);

      const take_offer = await dotc.connect(acc2).takePartialOffer(offerId, amountOut_to_take);

      await expect(take_offer)
        .to.emit(dotc, 'TakenOffer')
        .withArgs(offerId, await acc2.getAddress(), false, realAmount, amountOut_to_take);
      await expect(take_offer).to.emit(escrow, 'OfferWithdrawn').withArgs(offerId, await acc2.getAddress(), realAmount);

      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(balance.sub(realAmount));
      expect(await erc20_18.balanceOf(escrow.address)).to.eq(balance.sub(realAmount));
      expect(await erc20_18.balanceOf(await acc2.getAddress())).to.eq(realAmount);
      expect(await erc20_6.balanceOf(await acc1.getAddress())).to.eq(BigNumber.from(amountOut_to_take).sub(fees));
      expect(await erc20_6.balanceOf(await deployer.getAddress())).to.eq(BigNumber.from(deployerBalance_2).add(fees));

      expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(
        standardizeNumber(BigNumber.from(50).mul(BigNumber.from(10).pow(decimals_6)), decimals_6),
      );
      expect((await dotc.allOffers(0)).validityType).to.eq(AwaitingOffer.validityType);

      expect(await dotc.offersFromAddress(await acc1.getAddress(), 0)).to.eq(offerId);

    });

    it('Should take partial offer fully (erc20 => erc20)', async () => {
      const { dotc, escrow, dotcManager, erc20_18, erc20_6, acc1, acc2, deployer } = await loadFixture(fixture);


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
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_6.address,
        amount: amountOut_asset,
        tokenId: 0,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        amount: standardizeNumber(amountIn_asset, decimals_18),
        tokenId: 0,
      };

      const WithdrawalAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_6.address,
        amount: standardizeNumber(amountOut_asset, decimals_6),
        tokenId: 0,
      };

      const Offer: OfferStructStruct = {
        isFullType: false,
        specialAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc1.getAddress(),
        isFullyTaken: true,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC20_standardized,
        availableAmount: DepositAssetERC20_standardized.amount,
        unitPrice: BigNumber.from(WithdrawalAssetERC20_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_18))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
        offer: Offer,
      };

      const fees = BigNumber.from(amountOut_asset)
        .mul(await dotcManager.feeAmount())
        .div(await dotcManager.BPS());
      const deployerBalance_2 = await erc20_6.balanceOf(await deployer.getAddress());

      const amountToWitdraw = BigNumber.from(WithdrawalAssetERC20_standardized.amount)
        .mul(BigNumber.from(10).pow(await dotcManager.DECIMALS()))
        .div(BigNumber.from(AwaitingOffer.unitPrice));
      const realAmount = unstandardizeNumber(amountToWitdraw, await erc20_18.decimals());

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

      const balance = await erc20_18.balanceOf(escrow.address);

      const take_offer = await dotc.connect(acc2).takeOffer(offerId, WithdrawalAssetERC20.amount);

      await expect(take_offer)
        .to.emit(dotc, 'TakenOffer')
        .withArgs(offerId, await acc2.getAddress(), true, DepositAssetERC20.amount, WithdrawalAssetERC20.amount);

      await expect(take_offer)
        .to.emit(escrow, 'OfferWithdrawn')
        .withArgs(offerId, await acc2.getAddress(), DepositAssetERC20.amount);

      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(
        balance.sub(BigNumber.from(DepositAssetERC20.amount)),
      ); //0
      expect(await erc20_18.balanceOf(escrow.address)).to.eq(balance.sub(BigNumber.from(DepositAssetERC20.amount))); //0
      expect(await erc20_18.balanceOf(await acc2.getAddress())).to.eq(DepositAssetERC20.amount);
      expect(await erc20_6.balanceOf(await acc1.getAddress())).to.eq(BigNumber.from(amountOut_asset).sub(fees));
      expect(await erc20_6.balanceOf(await deployer.getAddress())).to.eq(BigNumber.from(deployerBalance_2).add(fees));

      expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
      expect((await dotc.allOffers(0)).validityType).to.eq(AwaitingOffer.validityType);

      expect(await dotc.offersFromAddress(await acc1.getAddress(), 0)).to.eq(offerId);
    });

    it('Should take full offer (erc20 => erc721)', async () => {
      const { dotc, escrow, assetHelper, erc20_18, erc721, acc1, acc2, deployer, otherAcc } = await loadFixture(
        fixture,
      );

      let offerId = 0;

      const amountIn = 43;

      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));

      await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
      await erc721['safeTransferFrom(address,address,uint256)'](await deployer.getAddress(), await acc2.getAddress(), 4);

      await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC721: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 1,
        tokenId: 4,
      };

      const Price: PriceStruct = {
        unitPrice: 0,
        min: 0,
        max: 0,
        percentage: 0
      }

      const Offer: OfferStruct = {
        takingOfferType: TakingOfferType.FullyTaking,
        offerPricingType: OfferPricingType.FixedPricing,
        price: Price,
        specialAddresses: [],
        authorizationAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc1.getAddress(),
        validityType: ValidityType.FullyTaken,
        depositAsset: DepositAssetERC20,
        withdrawalAsset: WithdrawalAssetERC721,
        offer: Offer,
      };

      const fees = BigNumber.from(DepositAssetERC20.amount)
        .mul(await escrow.feeAmount())
        .div(await assetHelper.BPS());
      const outAmount =
        BigNumber.from(DepositAssetERC20.amount).sub(fees);

      const deployerBalance_2 = await erc20_18.balanceOf(await deployer.getAddress());

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC721, AwaitingOffer.offer);

      const take_offer = await dotc.connect(acc2).takeFullOffer(offerId);

      await expect(take_offer)
        .to.emit(dotc, 'TakenOffer')
        .withArgs(offerId, await acc2.getAddress(), AwaitingOffer.validityType, outAmount, 1);
      await expect(take_offer).to.emit(escrow, 'OfferWithdrawn').withArgs(offerId, await acc2.getAddress(), outAmount);

      expect(await erc20_18.balanceOf(escrow.address)).to.eq(0);
      expect(await erc20_18.balanceOf(await acc2.getAddress())).to.eq(outAmount);
      expect(await erc20_18.balanceOf(await deployer.getAddress())).to.eq(
        BigNumber.from(deployerBalance_2).add(fees),
      );
      expect(await erc721.ownerOf(WithdrawalAssetERC721.tokenId)).to.eq(await acc1.getAddress());

      expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
      expect((await dotc.allOffers(0)).validityType).to.eq(AwaitingOffer.validityType);

      expect(await dotc.offersFromAddress(await acc1.getAddress(), 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
    });

    it('Should take full offer (erc721 => erc20)', async () => {
      const { dotc, escrow, assetHelper, erc20_18, erc721, acc1, acc2, deployer, otherAcc } = await loadFixture(fixture);

      const offerId = 0;

      const amountIn = 43;

      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));

      await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
      await erc721['safeTransferFrom(address,address,uint256)'](await deployer.getAddress(), await acc2.getAddress(), 4);

      await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC721: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 1,
        tokenId: 4,
      };

      const Price: PriceStruct = {
        unitPrice: 0,
        min: 0,
        max: 0,
        percentage: 0
      }

      const Offer: OfferStruct = {
        takingOfferType: TakingOfferType.FullyTaking,
        offerPricingType: OfferPricingType.FixedPricing,
        price: Price,
        specialAddresses: [],
        authorizationAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc2.getAddress(),
        validityType: ValidityType.FullyTaken,
        depositAsset: WithdrawalAssetERC721,
        withdrawalAsset: DepositAssetERC20,
        offer: Offer,
      };

      const fees = BigNumber.from(DepositAssetERC20.amount)
        .mul(await escrow.feeAmount())
        .div(await assetHelper.BPS());
      const outAmount =
        BigNumber.from(DepositAssetERC20.amount).sub(fees);
      const deployerBalance_2 = await erc20_18.balanceOf(await deployer.getAddress());

      await dotc.connect(acc2).makeOffer(WithdrawalAssetERC721, DepositAssetERC20, AwaitingOffer.offer);

      const take_offer = await dotc.connect(acc1).takeFullOffer(offerId);

      await expect(take_offer)
        .to.emit(dotc, 'TakenOffer')
        .withArgs(offerId, await acc1.getAddress(), AwaitingOffer.validityType, 1, outAmount);
      await expect(take_offer).to.emit(escrow, 'OfferWithdrawn').withArgs(offerId, await acc1.getAddress(), 1);

      expect(await erc721.balanceOf(escrow.address)).to.eq(0);
      expect(await erc721.ownerOf(WithdrawalAssetERC721.tokenId)).to.eq(await acc1.getAddress());

      expect(await erc20_18.balanceOf(await acc2.getAddress())).to.eq(BigNumber.from(DepositAssetERC20.amount).sub(fees));
      expect(await erc20_18.balanceOf(await deployer.getAddress())).to.eq(BigNumber.from(deployerBalance_2).add(fees));

      expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
      expect((await dotc.allOffers(0)).validityType).to.eq(AwaitingOffer.validityType);

      expect(await dotc.offersFromAddress(await acc2.getAddress(), 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
    });

    it('Should take full offer (erc20 => erc1155)', async () => {
      const { dotc, escrow, assetHelper, erc20_18, erc1155, acc1, acc2, deployer, otherAcc } = await loadFixture(fixture);

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
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 202,
        tokenId: 3,
      };

      const Price: PriceStruct = {
        unitPrice: 0,
        min: 0,
        max: 0,
        percentage: 0
      }

      const Offer: OfferStruct = {
        takingOfferType: TakingOfferType.FullyTaking,
        offerPricingType: OfferPricingType.FixedPricing,
        price: Price,
        specialAddresses: [],
        authorizationAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc1.getAddress(),
        validityType: ValidityType.FullyTaken,
        depositAsset: DepositAssetERC20,
        withdrawalAsset: WithdrawalAssetERC1155,
        offer: Offer,
      };

      const fees = BigNumber.from(DepositAssetERC20.amount)
        .mul(await escrow.feeAmount())
        .div(await assetHelper.BPS());
      const outAmount =
        BigNumber.from(DepositAssetERC20.amount).sub(fees);

      const deployerBalance_2 = await erc20_18.balanceOf(await deployer.getAddress());

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC1155, AwaitingOffer.offer);

      const take_offer = await dotc.connect(acc2).takeFullOffer(offerId);

      await expect(take_offer)
        .to.emit(dotc, 'TakenOffer')
        .withArgs(offerId, await acc2.getAddress(), AwaitingOffer.validityType, outAmount, WithdrawalAssetERC1155.amount);
      await expect(take_offer).to.emit(escrow, 'OfferWithdrawn').withArgs(offerId, await acc2.getAddress(), outAmount);

      expect(await erc20_18.balanceOf(escrow.address)).to.eq(0);
      expect(await erc20_18.balanceOf(await acc2.getAddress())).to.eq(outAmount);
      expect(await erc20_18.balanceOf(await deployer.getAddress())).to.eq(
        BigNumber.from(deployerBalance_2).add(fees),
      );
      expect(await erc1155.balanceOf(await acc1.getAddress(), WithdrawalAssetERC1155.tokenId)).to.eq(
        WithdrawalAssetERC1155.amount,
      );

      expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
      expect((await dotc.allOffers(0)).validityType).to.eq(AwaitingOffer.validityType);

      expect(await dotc.offersFromAddress(await acc1.getAddress(), 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
    });

    it('Should take full offer (erc1155 => erc20)', async () => {
      const { dotc, escrow, assetHelper, erc20_18, erc1155, acc1, acc2, deployer, otherAcc } = await loadFixture(fixture);

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
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 202,
        tokenId: 3,
      };

      const Price: PriceStruct = {
        unitPrice: 0,
        min: 0,
        max: 0,
        percentage: 0
      }

      const Offer: OfferStruct = {
        takingOfferType: TakingOfferType.FullyTaking,
        offerPricingType: OfferPricingType.FixedPricing,
        price: Price,
        specialAddresses: [],
        authorizationAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc2.getAddress(),
        validityType: ValidityType.FullyTaken,
        depositAsset: WithdrawalAssetERC1155,
        withdrawalAsset: DepositAssetERC20,
        offer: Offer,
      };

      const fees = BigNumber.from(DepositAssetERC20.amount)
        .mul(await escrow.feeAmount())
        .div(await assetHelper.BPS());
      const outAmount =
        BigNumber.from(DepositAssetERC20.amount).sub(fees);

      const deployerBalance_2 = await erc20_18.balanceOf(await deployer.getAddress());

      await dotc.connect(acc2).makeOffer(WithdrawalAssetERC1155, DepositAssetERC20, AwaitingOffer.offer);

      const take_offer = await dotc.connect(acc1).takeFullOffer(offerId);

      await expect(take_offer)
        .to.emit(dotc, 'TakenOffer')
        .withArgs(offerId, await acc1.getAddress(), AwaitingOffer.validityType, WithdrawalAssetERC1155.amount, outAmount);
      await expect(take_offer)
        .to.emit(escrow, 'OfferWithdrawn')
        .withArgs(offerId, await acc1.getAddress(), WithdrawalAssetERC1155.amount);

      expect(await erc1155.balanceOf(escrow.address, WithdrawalAssetERC1155.tokenId)).to.eq(0);
      expect(await erc1155.balanceOf(await acc1.getAddress(), WithdrawalAssetERC1155.tokenId)).to.eq(
        WithdrawalAssetERC1155.amount,
      );

      expect(await erc20_18.balanceOf(await acc2.getAddress())).to.eq(BigNumber.from(DepositAssetERC20.amount).sub(fees));
      expect(await erc20_18.balanceOf(await deployer.getAddress())).to.eq(BigNumber.from(deployerBalance_2).add(fees));

      expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
      expect((await dotc.allOffers(0)).validityType).to.eq(AwaitingOffer.validityType);

      expect(await dotc.offersFromAddress(await acc2.getAddress(), 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
    });

    it('Should take full offer (erc721 => erc721)', async () => {
      const { dotc, escrow, erc721, acc1, acc2, deployer, otherAcc } = await loadFixture(fixture);


      const offerId = 0;

      await erc721['safeTransferFrom(address,address,uint256)'](await deployer.getAddress(), await acc1.getAddress(), 2);
      await erc721['safeTransferFrom(address,address,uint256)'](await deployer.getAddress(), await acc2.getAddress(), 4);

      await erc721.connect(acc1).setApprovalForAll(dotc.address, true);
      await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC721: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 1,
        tokenId: 2,
      };

      const WithdrawalAssetERC721: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 1,
        tokenId: 4,
      };

      const Price: PriceStruct = {
        unitPrice: 0,
        min: 0,
        max: 0,
        percentage: 0
      }

      const Offer: OfferStruct = {
        takingOfferType: TakingOfferType.FullyTaking,
        offerPricingType: OfferPricingType.FixedPricing,
        price: Price,
        specialAddresses: [],
        authorizationAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc1.getAddress(),
        validityType: ValidityType.FullyTaken,
        depositAsset: DepositAssetERC721,
        withdrawalAsset: WithdrawalAssetERC721,
        offer: Offer,
      };

      await dotc.connect(acc1).makeOffer(DepositAssetERC721, WithdrawalAssetERC721, AwaitingOffer.offer);

      const take_offer = await dotc.connect(acc2).takeFullOffer(offerId);

      await expect(take_offer)
        .to.emit(dotc, 'TakenOffer')
        .withArgs(offerId, await acc2.getAddress(), AwaitingOffer.validityType, AwaitingOffer.depositAsset.amount, 1);
      await expect(take_offer).to.emit(escrow, 'OfferWithdrawn').withArgs(offerId, await acc2.getAddress(), 1);

      expect(await erc721.balanceOf(escrow.address)).to.eq(0);
      expect(await erc721.ownerOf(DepositAssetERC721.tokenId)).to.eq(await acc2.getAddress());
      expect(await erc721.ownerOf(WithdrawalAssetERC721.tokenId)).to.eq(await acc1.getAddress());

      expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
      expect((await dotc.allOffers(0)).validityType).to.eq(AwaitingOffer.validityType);

      expect(await dotc.offersFromAddress(await acc1.getAddress(), 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
    });

    it('Should take full offer (erc1155 => erc1155)', async () => {
      const { dotc, escrow, erc1155, acc1, acc2, deployer, otherAcc } = await loadFixture(fixture);

      const offerId = 0;

      await erc1155.safeTransferFrom(await deployer.getAddress(), await acc1.getAddress(), 5, 202, '0x00');
      await erc1155.safeTransferFrom(await deployer.getAddress(), await acc2.getAddress(), 3, 202, '0x00');

      await erc1155.connect(acc1).setApprovalForAll(dotc.address, true);
      await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 42,
        tokenId: 5,
      };

      const WithdrawalAssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 202,
        tokenId: 3,
      };

      const Price: PriceStruct = {
        unitPrice: 0,
        min: 0,
        max: 0,
        percentage: 0
      }

      const Offer: OfferStruct = {
        takingOfferType: TakingOfferType.FullyTaking,
        offerPricingType: OfferPricingType.FixedPricing,
        price: Price,
        specialAddresses: [],
        authorizationAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc1.getAddress(),
        validityType: ValidityType.FullyTaken,
        depositAsset: DepositAssetERC1155,
        withdrawalAsset: WithdrawalAssetERC1155,
        offer: Offer,
      };

      await dotc.connect(acc1).makeOffer(DepositAssetERC1155, WithdrawalAssetERC1155, AwaitingOffer.offer);

      const take_offer = await dotc.connect(acc2).takeFullOffer(offerId);

      await expect(take_offer)
        .to.emit(dotc, 'TakenOffer')
        .withArgs(offerId, await acc2.getAddress(), AwaitingOffer.validityType, AwaitingOffer.depositAsset.amount, AwaitingOffer.withdrawalAsset.amount);
      await expect(take_offer)
        .to.emit(escrow, 'OfferWithdrawn')
        .withArgs(offerId, await acc2.getAddress(), DepositAssetERC1155.amount);

      expect(await erc1155.balanceOf(escrow.address, DepositAssetERC1155.tokenId)).to.eq(0);
      expect(await erc1155.balanceOf(await acc1.getAddress(), WithdrawalAssetERC1155.tokenId)).to.eq(
        WithdrawalAssetERC1155.amount,
      );
      expect(await erc1155.balanceOf(await acc2.getAddress(), DepositAssetERC1155.tokenId)).to.eq(DepositAssetERC1155.amount);

      expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
      expect((await dotc.allOffers(0)).validityType).to.eq(AwaitingOffer.validityType);

      expect(await dotc.offersFromAddress(await acc1.getAddress(), 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
    });
  });

  describe('Cancel Offer', () => {
    it('Should cancel full offer (erc20 => erc20)', async () => {
      const { dotc, escrow, erc20_18, erc20_6, acc1, acc2 } = await loadFixture(fixture);


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
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_6.address,
        amount: amountOut_asset,
        tokenId: 0,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        amount: standardizeNumber(amountIn_asset, decimals_18),
        tokenId: 0,
      };

      const WithdrawalAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_6.address,
        amount: standardizeNumber(amountOut_asset, decimals_6),
        tokenId: 0,
      };

      const Offer: OfferStructStruct = {
        isFullType: true,
        specialAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: now + 200,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc1.getAddress(),
        isFullyTaken: true,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC20_standardized,
        availableAmount: 0,
        unitPrice: BigNumber.from(WithdrawalAssetERC20_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_18))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
        offer: Offer,
      };

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

      await expect(dotc.connect(acc1).cancelOffer(offerId)).to.be.revertedWithCustomError(dotc, 'OfferInTimelockError');
      await time.increase(201);

      await expect(dotc.connect(acc2).cancelOffer(offerId)).to.be.revertedWithCustomError(
        dotc,
        'OnlyMakerAllowedError',
      );

      await dotcManager.changeEscrowAddress(escrowFalse.address);

      await expect(dotc.connect(acc1).cancelOffer(offerId))
        .to.be.revertedWithCustomError(dotc, 'EscrowCallFailedError')
        .withArgs(EscrowCallType.Cancel);

      await dotcManager.changeEscrowAddress(escrow.address);

      const cancel_offer = await dotc.connect(acc1).cancelOffer(offerId);

      await expect(cancel_offer)
        .to.emit(dotc, 'CanceledOffer')
        .withArgs(offerId, await acc1.getAddress(), DepositAssetERC20.amount);
      await expect(cancel_offer)
        .to.emit(escrow, 'OfferCancelled')
        .withArgs(offerId, await acc1.getAddress(), DepositAssetERC20.amount);

      expect(await erc20_18.balanceOf(escrow.address)).to.eq(0);
      expect(await erc20_18.balanceOf(await acc1.getAddress())).to.eq(DepositAssetERC20.amount);

      expect((await dotc.allOffers(0)).offer.takingOfferType).to.eq(false);
      expect((await dotc.allOffers(0)).maker).to.eq(addressZero);
      expect((await dotc.allOffers(0)).validityType).to.eq(false);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(0);
      expect((await dotc.allOffers(0)).unitPrice).to.eq(0);
      expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq([]);

      expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(0);
      expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(0);

      expect(await dotc.offersFromAddress(await acc1.getAddress(), 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(addressZero);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(0);

      await expect(dotc.connect(acc1).cancelOffer(2002)).to.be.revertedWithCustomError(dotc, 'OnlyMakerAllowedError');
    });

    it('Should cancel partial offer (erc20 => erc20)', async () => {
      const { dotc, escrow, dotcManager, erc20_18, erc20_6, acc1, acc2, deployer } = await loadFixture(fixture);


      let offerId = 0;

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
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_6.address,
        amount: amountOut_asset,
        tokenId: 0,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        amount: standardizeNumber(amountIn_asset, decimals_18),
        tokenId: 0,
      };

      const WithdrawalAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_6.address,
        amount: standardizeNumber(amountOut_asset, decimals_6),
        tokenId: 0,
      };

      const Offer: OfferStructStruct = {
        isFullType: false,
        specialAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc1.getAddress(),
        isFullyTaken: false,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC20_standardized,
        availableAmount: DepositAssetERC20_standardized.amount,
        unitPrice: BigNumber.from(WithdrawalAssetERC20_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_18))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
        offer: Offer,
      };

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

      const cancel_offer = await dotc.connect(acc1).cancelOffer(offerId);

      await expect(cancel_offer)
        .to.emit(dotc, 'CanceledOffer')
        .withArgs(offerId, await acc1.getAddress(), DepositAssetERC20.amount);
      await expect(cancel_offer)
        .to.emit(escrow, 'OfferCancelled')
        .withArgs(offerId, await acc1.getAddress(), DepositAssetERC20.amount);

      expect(await erc20_18.balanceOf(escrow.address)).to.eq(0);
      expect(await erc20_18.balanceOf(await acc1.getAddress())).to.eq(DepositAssetERC20.amount);

      expect((await dotc.allOffers(0)).offer.takingOfferType).to.eq(false);
      expect((await dotc.allOffers(0)).maker).to.eq(addressZero);
      expect((await dotc.allOffers(0)).validityType).to.eq(false);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(0);
      expect((await dotc.allOffers(0)).unitPrice).to.eq(0);
      expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq([]);

      expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(0);
      expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(0);

      expect(await dotc.offersFromAddress(await acc1.getAddress(), 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(addressZero);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(0);

      offerId++;
    });

    it('Should cancel partial with taken amount offer (erc20 => erc20)', async () => {
      const { dotc, escrow, dotcManager, erc20_18, erc20_6, acc1, acc2 } = await loadFixture(fixture);


      let offerId = 0;

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
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_6.address,
        amount: amountOut_asset,
        tokenId: 0,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        amount: standardizeNumber(amountIn_asset, decimals_18),
        tokenId: 0,
      };

      const WithdrawalAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_6.address,
        amount: standardizeNumber(amountOut_asset, decimals_6),
        tokenId: 0,
      };

      const Offer: OfferStructStruct = {
        isFullType: false,
        specialAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc1.getAddress(),
        isFullyTaken: false,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC20_standardized,
        availableAmount: DepositAssetERC20_standardized.amount,
        unitPrice: BigNumber.from(WithdrawalAssetERC20_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_18))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
        offer: Offer,
      };

      const amountToWitdraw = standardized_amountOut_to_take
        .mul(BigNumber.from(10).pow(await dotcManager.DECIMALS()))
        .div(BigNumber.from(AwaitingOffer.unitPrice));
      let amountToCancel = BigNumber.from(DepositAssetERC20_standardized.amount).sub(amountToWitdraw);
      const unstandardAmount = unstandardizeNumber(amountToCancel, await erc20_18.decimals());

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

      const balance = await erc20_18.balanceOf(escrow.address);

      await dotc.connect(acc2).takeOffer(offerId, amountOut_to_take);

      amountToCancel = (await escrow.assetDeposits(offerId)).amount;

      const cancel_offer = await dotc.connect(acc1).cancelOffer(offerId);

      await expect(cancel_offer).to.emit(dotc, 'CanceledOffer').withArgs(offerId, await acc1.getAddress(), amountToCancel);
      await expect(cancel_offer).to.emit(escrow, 'OfferCancelled').withArgs(offerId, await acc1.getAddress(), amountToCancel);

      expect(await erc20_18.balanceOf(escrow.address)).to.eq(0);
      expect(await erc20_18.balanceOf(await acc1.getAddress())).to.eq(amountToCancel);

      expect((await dotc.allOffers(0)).offer.takingOfferType).to.eq(false);
      expect((await dotc.allOffers(0)).maker).to.eq(addressZero);
      expect((await dotc.allOffers(0)).validityType).to.eq(false);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(0);
      expect((await dotc.allOffers(0)).unitPrice).to.eq(0);
      expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq([]);

      expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(0);
      expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(0);

      expect(await dotc.offersFromAddress(await acc1.getAddress(), 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(addressZero);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(0);

      offerId++;
    });

    it('Should cancel full offer (erc20 => erc721)', async () => {
      const { dotc, escrow, erc20_18, erc721, acc1, acc2, deployer } = await loadFixture(fixture);


      let offerId = 0;

      const amountIn = 43;
      const amountOut = BigNumber.from(1);

      const decimals_6 = 1;
      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));

      await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
      await erc721['safeTransferFrom(address,address,uint256)'](await deployer.getAddress(), await acc2.getAddress(), 4);

      await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC721: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        amount: 1,
        tokenId: 4,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        amount: standardizeNumber(amountIn_asset, decimals_18),
        tokenId: 0,
      };

      const WithdrawalAssetERC721_standardized: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        amount: standardizeNumber(amountOut, decimals_6),
        tokenId: 4,
      };

      const Offer: OfferStructStruct = {
        isFullType: true,
        specialAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc1.getAddress(),
        isFullyTaken: true,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC721_standardized,
        availableAmount: DepositAssetERC20_standardized.amount,
        unitPrice: BigNumber.from(WithdrawalAssetERC721_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_18))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
        offer: Offer,
      };

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC721, AwaitingOffer.offer);

      const cancel_offer = await dotc.connect(acc1).cancelOffer(offerId);

      await expect(cancel_offer)
        .to.emit(dotc, 'CanceledOffer')
        .withArgs(offerId, await acc1.getAddress(), DepositAssetERC20.amount);
      await expect(cancel_offer)
        .to.emit(escrow, 'OfferCancelled')
        .withArgs(offerId, await acc1.getAddress(), DepositAssetERC20.amount);

      expect(await erc20_18.balanceOf(escrow.address)).to.eq(0);
      expect(await erc20_18.balanceOf(await acc1.getAddress())).to.eq(DepositAssetERC20.amount);

      expect((await dotc.allOffers(0)).offer.takingOfferType).to.eq(false);
      expect((await dotc.allOffers(0)).maker).to.eq(addressZero);
      expect((await dotc.allOffers(0)).validityType).to.eq(false);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(0);
      expect((await dotc.allOffers(0)).unitPrice).to.eq(0);
      expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq([]);

      expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(0);
      expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(0);

      expect(await dotc.offersFromAddress(await acc1.getAddress(), 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(addressZero);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(0);

      offerId++;
    });

    it('Should cancel full offer (erc721 => erc20)', async () => {
      const { dotc, escrow, erc20_18, erc721, acc1, acc2, deployer } = await loadFixture(fixture);


      let offerId = 0;

      const amountIn = 43;
      const amountOut = BigNumber.from(1);

      const decimals_6 = 1;
      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));

      await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
      await erc721['safeTransferFrom(address,address,uint256)'](await deployer.getAddress(), await acc2.getAddress(), 4);

      await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC721: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        amount: 1,
        tokenId: 4,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        amount: standardizeNumber(amountIn_asset, decimals_18),
        tokenId: 0,
      };

      const WithdrawalAssetERC721_standardized: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        amount: standardizeNumber(amountOut, decimals_6),
        tokenId: 4,
      };

      const Offer: OfferStructStruct = {
        isFullType: true,
        specialAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc2.getAddress(),
        isFullyTaken: true,
        depositAsset: WithdrawalAssetERC721_standardized,
        withdrawalAsset: DepositAssetERC20_standardized,
        availableAmount: WithdrawalAssetERC721_standardized.amount,
        unitPrice: BigNumber.from(DepositAssetERC20_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_18))
          .div(BigNumber.from(WithdrawalAssetERC721_standardized.amount)),
        offer: Offer,
      };

      await dotc.connect(acc2).makeOffer(WithdrawalAssetERC721, DepositAssetERC20, AwaitingOffer.offer);

      const cancel_offer = await dotc.connect(acc2).cancelOffer(offerId);

      await expect(cancel_offer)
        .to.emit(dotc, 'CanceledOffer')
        .withArgs(offerId, await acc2.getAddress(), WithdrawalAssetERC721.amount);
      await expect(cancel_offer)
        .to.emit(escrow, 'OfferCancelled')
        .withArgs(offerId, await acc2.getAddress(), WithdrawalAssetERC721.amount);

      expect(await erc721.ownerOf(WithdrawalAssetERC721.tokenId)).to.eq(await acc2.getAddress());

      expect((await dotc.allOffers(0)).offer.takingOfferType).to.eq(false);
      expect((await dotc.allOffers(0)).maker).to.eq(addressZero);
      expect((await dotc.allOffers(0)).validityType).to.eq(false);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(0);
      expect((await dotc.allOffers(0)).unitPrice).to.eq(0);
      expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq([]);

      expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(0);
      expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(0);

      expect(await dotc.offersFromAddress(await acc2.getAddress(), 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(addressZero);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(0);

      offerId++;
    });

    it('Should cancel full offer (erc20 => erc1155)', async () => {
      const { dotc, escrow, erc20_18, erc1155, acc1, acc2, deployer } = await loadFixture(fixture);


      let offerId = 0;

      const amountIn = 43;
      const amountOut = BigNumber.from(202);

      const decimals_6 = 1;
      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));

      await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
      await erc1155.safeTransferFrom(await deployer.getAddress(), await acc2.getAddress(), 3, 202, '0x00');

      await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 202,
        tokenId: 3,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        amount: standardizeNumber(amountIn_asset, decimals_18),
        tokenId: 0,
      };

      const WithdrawalAssetERC1155_standardized: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: standardizeNumber(amountOut, decimals_6),
        tokenId: 3,
      };

      const Offer: OfferStructStruct = {
        isFullType: true,
        specialAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc1.getAddress(),
        isFullyTaken: true,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC1155_standardized,
        availableAmount: DepositAssetERC20_standardized.amount,
        unitPrice: BigNumber.from(WithdrawalAssetERC1155_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_18))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
        offer: Offer,
      };

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC1155, AwaitingOffer.offer);

      const cancel_offer = await dotc.connect(acc1).cancelOffer(offerId);

      await expect(cancel_offer)
        .to.emit(dotc, 'CanceledOffer')
        .withArgs(offerId, await acc1.getAddress(), DepositAssetERC20.amount);
      await expect(cancel_offer)
        .to.emit(escrow, 'OfferCancelled')
        .withArgs(offerId, await acc1.getAddress(), DepositAssetERC20.amount);

      expect(await erc20_18.balanceOf(escrow.address)).to.eq(0);
      expect(await erc20_18.balanceOf(await acc1.getAddress())).to.eq(DepositAssetERC20.amount);

      expect((await dotc.allOffers(0)).offer.takingOfferType).to.eq(false);
      expect((await dotc.allOffers(0)).maker).to.eq(addressZero);
      expect((await dotc.allOffers(0)).validityType).to.eq(false);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(0);
      expect((await dotc.allOffers(0)).unitPrice).to.eq(0);
      expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq([]);

      expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(0);
      expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(0);

      expect(await dotc.offersFromAddress(await acc1.getAddress(), 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(addressZero);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(0);

      offerId++;
    });

    it('Should cancel full offer (erc1155 => erc20)', async () => {
      const { dotc, escrow, erc20_18, erc1155, acc1, acc2, deployer } = await loadFixture(fixture);

      let offerId = 0;

      const amountIn = 43;
      const amountOut = BigNumber.from(202);

      const decimals_6 = 1;
      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));

      await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
      await erc1155.safeTransferFrom(await deployer.getAddress(), await acc2.getAddress(), 3, 202, '0x00');

      await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 202,
        tokenId: 3,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        amount: standardizeNumber(amountIn_asset, decimals_18),
        tokenId: 0,
      };

      const WithdrawalAssetERC1155_standardized: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: standardizeNumber(amountOut, decimals_6),
        tokenId: 3,
      };

      const Offer: OfferStructStruct = {
        isFullType: true,
        specialAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc2.getAddress(),
        isFullyTaken: true,
        depositAsset: WithdrawalAssetERC1155_standardized,
        withdrawalAsset: DepositAssetERC20_standardized,
        availableAmount: WithdrawalAssetERC1155_standardized.amount,
        unitPrice: BigNumber.from(DepositAssetERC20_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_18))
          .div(BigNumber.from(WithdrawalAssetERC1155_standardized.amount)),
        offer: Offer,
      };

      await dotc.connect(acc2).makeOffer(WithdrawalAssetERC1155, DepositAssetERC20, AwaitingOffer.offer);

      const cancel_offer = await dotc.connect(acc2).cancelOffer(offerId);

      await expect(cancel_offer)
        .to.emit(dotc, 'CanceledOffer')
        .withArgs(offerId, await acc2.getAddress(), WithdrawalAssetERC1155.amount);
      await expect(cancel_offer)
        .to.emit(escrow, 'OfferCancelled')
        .withArgs(offerId, await acc2.getAddress(), WithdrawalAssetERC1155.amount);

      expect(await erc1155.balanceOf(escrow.address, WithdrawalAssetERC1155.tokenId)).to.eq(0);
      expect(await erc1155.balanceOf(await acc2.getAddress(), WithdrawalAssetERC1155.tokenId)).to.eq(
        WithdrawalAssetERC1155.amount,
      );

      expect((await dotc.allOffers(0)).offer.takingOfferType).to.eq(false);
      expect((await dotc.allOffers(0)).maker).to.eq(addressZero);
      expect((await dotc.allOffers(0)).validityType).to.eq(false);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(0);
      expect((await dotc.allOffers(0)).unitPrice).to.eq(0);
      expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq([]);

      expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(0);
      expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(0);

      expect(await dotc.offersFromAddress(await acc2.getAddress(), 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(addressZero);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(0);

      offerId++;
    });

    it('Should cancel full offer (erc721 => erc721)', async () => {
      const { dotc, escrow, erc721, acc1, acc2, deployer } = await loadFixture(fixture);


      let offerId = 0;

      const amount = BigNumber.from(1);
      const decimals = 1;

      await erc721['safeTransferFrom(address,address,uint256)'](await deployer.getAddress(), await acc1.getAddress(), 2);
      await erc721['safeTransferFrom(address,address,uint256)'](await deployer.getAddress(), await acc2.getAddress(), 4);

      await erc721.connect(acc1).setApprovalForAll(dotc.address, true);
      await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC721: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        amount: 1,
        tokenId: 2,
      };

      const WithdrawalAssetERC721: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        amount: 1,
        tokenId: 4,
      };

      const DepositAssetERC721_standardized: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        amount: 1,
        tokenId: 2,
      };

      const WithdrawalAssetERC721_standardized: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        amount: 1,
        tokenId: 4,
      };

      const Offer: OfferStructStruct = {
        isFullType: true,
        specialAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc1.getAddress(),
        isFullyTaken: true,
        depositAsset: DepositAssetERC721_standardized,
        withdrawalAsset: WithdrawalAssetERC721_standardized,
        availableAmount: DepositAssetERC721_standardized.amount,
        unitPrice: BigNumber.from(WithdrawalAssetERC721_standardized.amount)
          .mul(ethers.utils.parseEther('1'))
          .div(BigNumber.from(DepositAssetERC721_standardized.amount)),
        offer: Offer,
      };

      await dotc.connect(acc2).makeOffer(WithdrawalAssetERC721, DepositAssetERC721, AwaitingOffer.offer);

      const cancel_offer = await dotc.connect(acc2).cancelOffer(offerId);

      await expect(cancel_offer)
        .to.emit(dotc, 'CanceledOffer')
        .withArgs(offerId, await acc2.getAddress(), WithdrawalAssetERC721.amount);
      await expect(cancel_offer)
        .to.emit(escrow, 'OfferCancelled')
        .withArgs(offerId, await acc2.getAddress(), WithdrawalAssetERC721.amount);

      expect(await erc721.ownerOf(WithdrawalAssetERC721.tokenId)).to.eq(await acc2.getAddress());

      expect((await dotc.allOffers(0)).offer.takingOfferType).to.eq(false);
      expect((await dotc.allOffers(0)).maker).to.eq(addressZero);
      expect((await dotc.allOffers(0)).validityType).to.eq(false);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(0);
      expect((await dotc.allOffers(0)).unitPrice).to.eq(0);
      expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq([]);

      expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(0);
      expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(0);

      expect(await dotc.offersFromAddress(await acc2.getAddress(), 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(addressZero);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(0);

      offerId++;
    });

    it('Should cancel full offer (erc1155 => erc1155)', async () => {
      const { dotc, escrow, erc1155, acc1, acc2, deployer } = await loadFixture(fixture);


      let offerId = 0;

      const amountIn = BigNumber.from(42);
      const amountOut = BigNumber.from(202);

      const decimals = 1;

      await erc1155.safeTransferFrom(await deployer.getAddress(), await acc1.getAddress(), 5, 202, '0x00');
      await erc1155.safeTransferFrom(await deployer.getAddress(), await acc2.getAddress(), 3, 202, '0x00');

      await erc1155.connect(acc1).setApprovalForAll(dotc.address, true);
      await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 42,
        tokenId: 5,
      };

      const WithdrawalAssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 202,
        tokenId: 3,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: 42,
        tokenId: 5,
      };

      const WithdrawalAssetERC1155_standardized: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: 202,
        tokenId: 3,
      };

      const Offer: OfferStructStruct = {
        isFullType: true,
        specialAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc1.getAddress(),
        isFullyTaken: true,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC1155_standardized,
        availableAmount: DepositAssetERC20_standardized.amount,
        unitPrice: BigNumber.from(WithdrawalAssetERC1155_standardized.amount)
          .mul(ethers.utils.parseEther('1'))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
        offer: Offer,
      };

      await dotc.connect(acc2).makeOffer(WithdrawalAssetERC1155, DepositAssetERC1155, AwaitingOffer.offer);

      const cancel_offer = await dotc.connect(acc2).cancelOffer(offerId);

      await expect(cancel_offer)
        .to.emit(dotc, 'CanceledOffer')
        .withArgs(offerId, await acc2.getAddress(), WithdrawalAssetERC1155.amount);
      await expect(cancel_offer)
        .to.emit(escrow, 'OfferCancelled')
        .withArgs(offerId, await acc2.getAddress(), WithdrawalAssetERC1155.amount);

      expect(await erc1155.balanceOf(escrow.address, WithdrawalAssetERC1155.tokenId)).to.eq(0);
      expect(await erc1155.balanceOf(await acc2.getAddress(), WithdrawalAssetERC1155.tokenId)).to.eq(
        WithdrawalAssetERC1155.amount,
      );

      expect((await dotc.allOffers(0)).offer.takingOfferType).to.eq(false);
      expect((await dotc.allOffers(0)).maker).to.eq(addressZero);
      expect((await dotc.allOffers(0)).validityType).to.eq(false);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(0);
      expect((await dotc.allOffers(0)).unitPrice).to.eq(0);
      expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq([]);

      expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(0);
      expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(0);

      expect(await dotc.offersFromAddress(await acc2.getAddress(), 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(addressZero);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(0);

      offerId++;
    });
  });

  describe('Update Offer', () => {
    it('Should update full offer (erc20 => erc20)', async () => {
      const { dotc, escrow, erc20_18, erc20_6, acc1, acc2, acc3, deployer } = await loadFixture(fixture);


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
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_6.address,
        amount: amountOut_asset,
        tokenId: 0,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        amount: standardizeNumber(amountIn_asset, decimals_18),
        tokenId: 0,
      };

      const WithdrawalAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_6.address,
        amount: standardizeNumber(amountOut_asset, decimals_6),
        tokenId: 0,
      };

      let Offer: OfferStructStruct = {
        isFullType: true,
        specialAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: now + 200,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc1.getAddress(),
        isFullyTaken: true,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC20_standardized,
        availableAmount: 0,
        unitPrice: BigNumber.from(WithdrawalAssetERC20_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_18))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
        offer: Offer,
      };

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

      const newAmountOut = amountOut_asset.add(amountOut_asset);
      const standardizedOut = standardizeNumber(newAmountOut, await erc20_6.decimals());

      await expect(dotc.connect(acc1).updateOffer(offerId, newAmountOut, Offer)).to.be.revertedWithCustomError(
        dotc,
        'OfferInTimelockError',
      );
      await time.increase(201);

      Offer.expiryTimestamp = 0;
      Offer.timelockPeriod = 0;
      Offer.terms = '';
      Offer.commsLink = '';
      const update_offer_1 = await dotc.connect(acc1).updateOffer(offerId, newAmountOut, Offer);

      await expect(update_offer_1).to.emit(dotc, 'OfferAmountUpdated').withArgs(offerId, newAmountOut);
      expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(standardizedOut);
      expect((await dotc.allOffers(0)).unitPrice).to.eq(
        BigNumber.from(standardizedOut)
          .mul(BigNumber.from(10).pow(decimals_18))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
      );

      Offer.expiryTimestamp = now + 20000;
      Offer.timelockPeriod = 0;

      const update_offer_2 = await dotc.connect(acc1).updateOffer(offerId, 0, Offer);
      await expect(update_offer_2)
        .to.emit(dotc, 'UpdatedOfferExpiry')
        .withArgs(offerId, now + 20000);
      expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(now + 20000);

      Offer.expiryTimestamp = 0;
      Offer.timelockPeriod = now + 300;
      const update_offer_3 = await dotc.connect(acc1).updateOffer(offerId, 0, Offer);
      await expect(update_offer_3)
        .to.emit(dotc, 'UpdatedTimeLockPeriod')
        .withArgs(offerId, now + 300);
      expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(now + 300);

      await time.increase(300);

      Offer.terms = 'newTerms';
      Offer.commsLink = 'newCommsLink';
      const update_offer_4 = await dotc.connect(acc1).updateOffer(offerId, newAmountOut, Offer);
      await expect(update_offer_4).to.emit(dotc, 'OfferLinksUpdated').withArgs(offerId, 'newTerms', 'newCommsLink');
      expect((await dotc.allOffers(offerId)).offer.terms).to.eq('newTerms');
      expect((await dotc.allOffers(offerId)).offer.commsLink).to.eq('newCommsLink');

      Offer.timelockPeriod = 0;
      await expect(dotc.connect(acc2).updateOffer(offerId, newAmountOut, Offer)).to.be.revertedWithCustomError(
        dotc,
        'OnlyMakerAllowedError',
      );

      Offer.timelockPeriod = now + 100000;
      await expect(dotc.connect(acc1).updateOffer(offerId, 0, Offer)).to.be.revertedWithCustomError(
        dotc,
        'IncorrectTimelockPeriodError',
      );

      await expect(dotc.connect(acc1).updateOffer(2002, 0, Offer)).to.be.revertedWithCustomError(
        dotc,
        'OnlyMakerAllowedError',
      );

      Offer.specialAddresses = [addressZero];
      await expect(dotc.connect(acc1).updateOffer(offerId, newAmountOut, Offer)).to.be.revertedWithCustomError(
        dotc,
        'OfferAddressIsZeroError',
      );

      Offer.specialAddresses = [await acc2.getAddress()];
      Offer.expiryTimestamp = now + 2000;
      Offer.timelockPeriod = now + 200;
      const update_offer_5 = await dotc.connect(acc1).updateOffer(offerId, newAmountOut, Offer);
      await expect(update_offer_5).to.emit(dotc, 'OfferSpecialAddressesUpdated').withArgs(offerId, [await acc2.getAddress()]);
      expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq([await acc2.getAddress()]);

      await expect(
        dotc.connect(deployer).takeOffer(offerId, WithdrawalAssetERC20.amount),
      ).to.be.revertedWithCustomError(dotc, 'NotSpecialAddressError');
      await expect(dotc.connect(acc3).takeOffer(offerId, WithdrawalAssetERC20.amount)).to.be.revertedWithCustomError(
        dotc,
        'NotSpecialAddressError',
      );

      // Checks if threw another message (that is lower in hirarchy) than 'Dotc: Only Special addresses allowed to take offer' then special addresses works correctly
      await expect(dotc.connect(acc2).takeOffer(offerId, WithdrawalAssetERC20.amount)).to.be.revertedWithCustomError(
        dotc,
        'IncorrectFullOfferAmountError',
      );
    });

    it('Should update full offer (erc20 => erc1155)', async () => {
      const { dotc, erc1155, erc20_18, acc1, acc2, deployer } = await loadFixture(fixture);


      let offerId = 0;

      const amountIn = 43;
      const amountOut = BigNumber.from(202);

      const decimals_6 = 1;
      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));

      await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
      await erc1155.safeTransferFrom(await deployer.getAddress(), await acc2.getAddress(), 3, 202, '0x00');

      await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 202,
        tokenId: 3,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        amount: standardizeNumber(amountIn_asset, decimals_18),
        tokenId: 0,
      };

      const WithdrawalAssetERC1155_standardized: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: standardizeNumber(amountOut, decimals_6),
        tokenId: 3,
      };

      const Offer: OfferStructStruct = {
        isFullType: true,
        specialAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc2.getAddress(),
        isFullyTaken: true,
        depositAsset: WithdrawalAssetERC1155_standardized,
        withdrawalAsset: DepositAssetERC20_standardized,
        availableAmount: WithdrawalAssetERC1155_standardized.amount,
        unitPrice: BigNumber.from(DepositAssetERC20_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_18))
          .div(BigNumber.from(WithdrawalAssetERC1155_standardized.amount)),
        offer: Offer,
      };

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC1155, AwaitingOffer.offer);

      const newAmountOut = 100;

      const update_offer_1 = await dotc.connect(acc1).updateOffer(offerId, newAmountOut, Offer);

      await expect(update_offer_1).to.emit(dotc, 'OfferAmountUpdated').withArgs(offerId, newAmountOut);

      expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(newAmountOut);
      expect((await dotc.allOffers(0)).unitPrice).to.eq(
        BigNumber.from(newAmountOut)
          .mul(BigNumber.from(10).pow(decimals_18))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
      );

      offerId++;
    });

    it('Should update full offer (erc20 => erc721)', async () => {
      const { dotc, erc721, erc20_18, acc1, acc2, deployer } = await loadFixture(fixture);


      let offerId = 0;

      const amountIn = 43;
      const amountOut = BigNumber.from(1);

      const decimals_6 = 1;
      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_18));

      await erc20_18.transfer(await acc1.getAddress(), amountIn_asset);
      await erc721['safeTransferFrom(address,address,uint256)'](await deployer.getAddress(), await acc2.getAddress(), 4);

      await erc20_18.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC721: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        amount: 1,
        tokenId: 4,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_18.address,
        amount: standardizeNumber(amountIn_asset, decimals_18),
        tokenId: 0,
      };

      const WithdrawalAssetERC721_standardized: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        amount: standardizeNumber(amountOut, decimals_6),
        tokenId: 4,
      };

      const Offer: OfferStructStruct = {
        isFullType: true,
        specialAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: await acc2.getAddress(),
        isFullyTaken: true,
        depositAsset: WithdrawalAssetERC721_standardized,
        withdrawalAsset: DepositAssetERC20_standardized,
        availableAmount: WithdrawalAssetERC721_standardized.amount,
        unitPrice: BigNumber.from(DepositAssetERC20_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_18))
          .div(BigNumber.from(WithdrawalAssetERC721_standardized.amount)),
        offer: Offer,
      };

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC721, AwaitingOffer.offer);

      const newAmountOut = 100;

      await expect(dotc.connect(acc1).updateOffer(offerId, newAmountOut, Offer)).to.be.revertedWithCustomError(
        dotc,
        'ERC721OfferAmountChangeError',
      );
    });
  });
});

function standardizeNumber(amount: BigNumber, decimals: number) {
  const BPS = BigNumber.from('1000000000000000000000000000');
  const dec = BigNumber.from(10).pow(decimals);
  return BPS.mul(amount).div(dec);
}

function unstandardizeNumber(amount: BigNumber, decimals: number) {
  const BPS = BigNumber.from('1000000000000000000000000000');
  const dec = BigNumber.from(10).pow(decimals);
  return dec.mul(amount).div(BPS);
}
