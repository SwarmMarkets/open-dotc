import { ethers, upgrades } from 'hardhat';
import { BigNumber, ContractFactory } from 'ethers';
import { expect } from 'chai';
import { DotcManagerV2 as DotcManager, DotcEscrowV2 as DotcEscrow, DotcV2 as Dotc, ERC20Mock_3, ERC721Mock, ERC1155Mock } from '../../../typechain';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { AssetStruct, DotcOfferV2Struct as DotcOfferStruct, OfferStruct as OfferStructStruct } from '../../helpers/Structures';

//TODO: mock escrow with false statements
describe('DotcV2_Open', () => {
  const addressZero = ethers.constants.AddressZero;
  const terms = 'terms';
  const commsLink = 'commsLink';

  async function fixture() {
    const [deployer, acc1, acc2, acc3] = await ethers.getSigners();

    const DotcManager: ContractFactory = await ethers.getContractFactory('DotcManagerV2');
    const dotcManager = (await upgrades.deployProxy(DotcManager, [deployer.address])) as DotcManager;
    await dotcManager.deployed();

    const Dotc = await ethers.getContractFactory('DotcV2');
    const dotc = (await upgrades.deployProxy(Dotc, [dotcManager.address])) as Dotc;
    await dotc.deployed();

    const DotcEscrow: ContractFactory = await ethers.getContractFactory('DotcEscrowV2');
    const escrow = (await upgrades.deployProxy(DotcEscrow, [dotcManager.address])) as DotcEscrow;
    await escrow.deployed();

    const ERC20: ContractFactory = await ethers.getContractFactory('ERC20Mock_3');
    const erc20_1: ERC20Mock_3 = (await ERC20.deploy(18)) as ERC20Mock_3;
    await erc20_1.deployed();
    const erc20_2: ERC20Mock_3 = (await ERC20.deploy(6)) as ERC20Mock_3;
    await erc20_2.deployed();

    const ERC721: ContractFactory = await ethers.getContractFactory('ERC721Mock');
    const erc721: ERC721Mock = (await ERC721.deploy()) as ERC721Mock;
    await erc721.deployed();
    const ERC1155: ContractFactory = await ethers.getContractFactory('ERC1155Mock');
    const erc1155: ERC1155Mock = (await ERC1155.deploy()) as ERC1155Mock;
    await erc1155.deployed();

    await dotcManager.changeDotcAddress(dotc.address);
    await dotcManager.changeEscrowAddress(escrow.address);

    return {
      deployer,
      acc1,
      acc2,
      acc3,
      dotc,
      dotcManager,
      escrow,
      erc20_1,
      erc20_2,
      erc721,
      erc1155,
    };
  }

  describe('Deployment', () => {
    it('Should be proper addresses', async () => {
      const { dotc, dotcManager, escrow } = await loadFixture(fixture);

      expect(dotc.address).to.be.properAddress;
      expect(dotcManager.address).to.be.properAddress;
      expect(escrow.address).to.be.properAddress;
    });

    it('Should be initialized', async () => {
      const { dotc, dotcManager, escrow } = await loadFixture(fixture);

      await expect(dotcManager.initialize(escrow.address)).to.be.revertedWithCustomError(dotcManager, 'InvalidInitialization');
      await expect(escrow.initialize(dotcManager.address)).to.be.revertedWithCustomError(escrow, 'InvalidInitialization');
      await expect(dotc.initialize(dotcManager.address)).to.be.revertedWithCustomError(dotc, 'InvalidInitialization');
    });

    it('Should support interface', async () => {
      const { dotc, escrow } = await loadFixture(fixture);

      const IERC165_interface = '0x01ffc9a7';

      expect(await dotc.supportsInterface(IERC165_interface)).to.be.true;

      expect(await escrow.supportsInterface(IERC165_interface)).to.be.true;
    });
  });

  describe('Manager configuration', () => {
    it('Should be deployed correctly', async () => {
      const { dotc, dotcManager } = await loadFixture(fixture);

      expect(await dotc.manager()).to.be.eq(dotcManager.address);
    });

    it('Should change Manager address in Dotc and Escrow', async () => {
      const { dotc, escrow, dotcManager, deployer, acc2 } = await loadFixture(fixture);

      const tx = await dotcManager.changeManagerInContracts(acc2.address);

      await expect(tx).to.emit(dotcManager, 'ManagerAddressSet').withArgs(deployer.address, acc2.address);
      await expect(tx).to.emit(escrow, 'ManagerAddressSet').withArgs(dotcManager.address, acc2.address);
      await expect(tx).to.emit(dotc, 'ManagerAddressSet').withArgs(dotcManager.address, acc2.address);
      expect(await dotc.manager()).to.be.eq(acc2.address);
      expect(await escrow.manager()).to.be.eq(acc2.address);

      await expect(dotc.changeManager(acc2.address)).to.be.revertedWithCustomError(dotc, 'ManagerOnlyFunctionError');
    });
  });

  describe('Make offer', () => {
    it('Should make full offer (erc20 => erc20)', async () => {
      const { dotc, escrow, erc20_1, erc20_2, erc721, acc1, acc2 } = await loadFixture(fixture);

      let now = await time.latest();
      let offerId = 0;

      const amountIn = 43;
      const amountOut = 104;

      const decimals_1 = await erc20_1.decimals();
      const decimals_2 = await erc20_2.decimals();
      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_1));
      const amountOut_asset = BigNumber.from(amountOut).mul(BigNumber.from(10).pow(decimals_2));

      await erc20_1.transfer(acc1.address, amountIn_asset);
      await erc20_2.transfer(acc2.address, amountOut_asset);

      await erc20_1.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc20_2.connect(acc2).approve(dotc.address, amountOut_asset);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_2.address,
        amount: amountOut_asset,
        tokenId: 0,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: standardizeNumber(amountIn_asset, decimals_1),
        tokenId: 0,
      };

      const WithdrawalAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_2.address,
        amount: standardizeNumber(amountOut_asset, decimals_2),
        tokenId: 0,
      };

      let Offer: OfferStructStruct = {
        isFullType: true,
        specialAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: acc1.address,
        isFullyTaken: false,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC20_standardized,
        availableAmount: DepositAssetERC20_standardized.amount,
        unitPrice: BigNumber.from(WithdrawalAssetERC20_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_1))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
        offer: Offer,
      };

      const make_offer = await dotc
        .connect(acc1)
        .makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

      await expect(make_offer).to.emit(dotc, 'CreatedOffer');
      await expect(make_offer)
        .to.emit(escrow, 'OfferDeposited')
        .withArgs(offerId, acc1.address, DepositAssetERC20.amount);

      expect(await dotc.currentOfferId()).to.be.eq(offerId + 1);
      expect(await erc20_1.balanceOf(escrow.address)).to.eq(amountIn_asset);

      expect(await dotc.offersFromAddress(acc1.address, offerId)).to.eq(0);

      expect((await dotc.allOffers(0)).offer.isFullType).to.eq(AwaitingOffer.offer.isFullType);
      expect((await dotc.allOffers(0)).maker).to.eq(AwaitingOffer.maker);
      expect((await dotc.allOffers(0)).isFullyTaken).to.eq(AwaitingOffer.isFullyTaken);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(AwaitingOffer.availableAmount);
      expect((await dotc.allOffers(0)).unitPrice).to.eq(AwaitingOffer.unitPrice);
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

      Offer.expiryTimestamp = now + 20000;
      Offer.timelockPeriod = now + 20001;

      await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20, Offer)).to.be.revertedWithCustomError(
        dotc,
        'IncorrectTimelockPeriodError',
      );

      Offer.expiryTimestamp = now + 1;
      Offer.timelockPeriod = now;

      await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20, Offer)).to.be.revertedWithCustomError(
        dotc,
        'OfferExpiredTimestampError',
      );

      Offer.expiryTimestamp = now + 20000;
      Offer.timelockPeriod = now;

      await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20, Offer)).to.be.revertedWithCustomError(
        dotc,
        'IncorrectTimelockPeriodError',
      );

      const WithdrawalAssetERC721_false: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        amount: 1,
        tokenId: 4,
      };

      Offer.isFullType = false;
      Offer.timelockPeriod = 0;

      await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC721_false, Offer)).to.be.revertedWithCustomError(
        dotc,
        'UnsupportedPartialOfferForNonERC20AssetsError',
      );

      await expect(dotc.makeOffer(WithdrawalAssetERC721_false, DepositAssetERC20, Offer)).to.be.revertedWithCustomError(
        dotc,
        'UnsupportedPartialOfferForNonERC20AssetsError',
      );

      let DepositAssetERC20_false: AssetStruct = {
        assetType: 0,
        assetAddress: erc20_1.address,
        amount: amountIn_asset,
        tokenId: 0,
      };

      Offer.isFullType = true;

      await expect(dotc.makeOffer(DepositAssetERC20_false, WithdrawalAssetERC20, Offer)).to.be.revertedWithCustomError(
        dotc,
        'AssetTypeUndefinedError',
      );

      DepositAssetERC20_false = {
        assetType: 1,
        assetAddress: addressZero,
        amount: amountIn_asset,
        tokenId: 0,
      };

      await expect(dotc.makeOffer(DepositAssetERC20_false, WithdrawalAssetERC20, Offer)).to.be.revertedWithCustomError(
        dotc,
        'AssetAddressIsZeroError',
      );

      DepositAssetERC20_false = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: 0,
        tokenId: 0,
      };

      await expect(dotc.makeOffer(DepositAssetERC20_false, WithdrawalAssetERC20, Offer)).to.be.revertedWithCustomError(
        dotc,
        'AssetAmountIsZeroError',
      );

      let WithdrawalAssetERC20_false: AssetStruct = {
        assetType: 0,
        assetAddress: erc20_2.address,
        amount: amountOut_asset,
        tokenId: 0,
      };

      await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20_false, Offer)).to.be.revertedWithCustomError(
        dotc,
        'AssetTypeUndefinedError',
      );

      WithdrawalAssetERC20_false = {
        assetType: 1,
        assetAddress: addressZero,
        amount: amountOut_asset,
        tokenId: 0,
      };

      await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20_false, Offer)).to.be.revertedWithCustomError(
        dotc,
        'AssetAddressIsZeroError',
      );

      WithdrawalAssetERC20_false = {
        assetType: 1,
        assetAddress: erc20_2.address,
        amount: 0,
        tokenId: 0,
      };

      await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20_false, Offer)).to.be.revertedWithCustomError(
        dotc,
        'AssetAmountIsZeroError',
      );

      Offer.specialAddresses = [addressZero];
      await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20, Offer)).to.be.revertedWithCustomError(
        dotc,
        'OfferAddressIsZeroError',
      );
      Offer.specialAddresses = [acc1.address, addressZero, acc2.address];
      await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20, Offer)).to.be.revertedWithCustomError(
        dotc,
        'OfferAddressIsZeroError',
      );
    });

    it('Should make partial offer (erc20 => erc20)', async () => {
      const { dotc, escrow, erc20_1, erc20_2, acc1, acc2 } = await loadFixture(fixture);

      let now = await time.latest();
      let offerId = 0;

      const amountIn = 43;
      const amountOut = 104;

      const decimals_1 = await erc20_1.decimals();
      const decimals_2 = await erc20_2.decimals();
      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_1));
      const amountOut_asset = BigNumber.from(amountOut).mul(BigNumber.from(10).pow(decimals_2));

      await erc20_1.transfer(acc1.address, amountIn_asset);
      await erc20_2.transfer(acc2.address, amountOut_asset);

      await erc20_1.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc20_2.connect(acc2).approve(dotc.address, amountOut_asset);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_2.address,
        amount: amountOut_asset,
        tokenId: 0,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: standardizeNumber(amountIn_asset, decimals_1),
        tokenId: 0,
      };

      const WithdrawalAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_2.address,
        amount: standardizeNumber(amountOut_asset, decimals_2),
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
        maker: acc1.address,
        isFullyTaken: false,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC20_standardized,
        availableAmount: DepositAssetERC20_standardized.amount,
        unitPrice: BigNumber.from(WithdrawalAssetERC20_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_1))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
        offer: Offer,
      };

      const make_offer = await dotc
        .connect(acc1)
        .makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

      await expect(make_offer).to.emit(dotc, 'CreatedOffer');
      await expect(make_offer)
        .to.emit(escrow, 'OfferDeposited')
        .withArgs(offerId, acc1.address, DepositAssetERC20.amount);

      expect(await dotc.currentOfferId()).to.be.eq(offerId + 1);
      expect(await erc20_1.balanceOf(escrow.address)).to.eq(amountIn_asset);

      expect(await dotc.offersFromAddress(acc1.address, offerId)).to.eq(0);

      expect((await dotc.allOffers(0)).offer.isFullType).to.eq(AwaitingOffer.offer.isFullType);
      expect((await dotc.allOffers(0)).maker).to.eq(AwaitingOffer.maker);
      expect((await dotc.allOffers(0)).isFullyTaken).to.eq(AwaitingOffer.isFullyTaken);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(AwaitingOffer.availableAmount);
      expect((await dotc.allOffers(0)).unitPrice).to.eq(AwaitingOffer.unitPrice);
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

    it('Should make full offer (erc20 => erc721)', async () => {
      const { dotc, escrow, erc20_1, erc721, acc1, acc2, deployer } = await loadFixture(fixture);

      let now = await time.latest();
      let offerId = 0;

      const amountIn = 43;
      const amountOut = BigNumber.from(1);

      const decimals_1 = await erc20_1.decimals();
      const decimals_2 = 1;
      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_1));

      await erc20_1.transfer(acc1.address, amountIn_asset);
      await erc721['safeTransferFrom(address,address,uint256)'](deployer.address, acc2.address, 4);

      await erc20_1.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
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
        assetAddress: erc20_1.address,
        amount: standardizeNumber(amountIn_asset, decimals_1),
        tokenId: 0,
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
        maker: acc1.address,
        isFullyTaken: false,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC721_standardized,
        availableAmount: DepositAssetERC20_standardized.amount,
        unitPrice: BigNumber.from(WithdrawalAssetERC721_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_1))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
        offer: Offer,
      };

      const make_offer = await dotc
        .connect(acc1)
        .makeOffer(DepositAssetERC20, WithdrawalAssetERC721, AwaitingOffer.offer);

      await expect(make_offer).to.emit(dotc, 'CreatedOffer');
      await expect(make_offer)
        .to.emit(escrow, 'OfferDeposited')
        .withArgs(offerId, acc1.address, DepositAssetERC20.amount);

      expect(await dotc.currentOfferId()).to.be.eq(offerId + 1);
      expect(await erc20_1.balanceOf(escrow.address)).to.eq(amountIn_asset);

      expect(await dotc.offersFromAddress(acc1.address, offerId)).to.eq(0);

      expect((await dotc.allOffers(0)).offer.isFullType).to.eq(AwaitingOffer.offer.isFullType);
      expect((await dotc.allOffers(0)).maker).to.eq(AwaitingOffer.maker);
      expect((await dotc.allOffers(0)).isFullyTaken).to.eq(AwaitingOffer.isFullyTaken);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(AwaitingOffer.availableAmount);
      expect((await dotc.allOffers(0)).unitPrice).to.eq(AwaitingOffer.unitPrice);
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

    it('Should make full offer (erc721 => erc20)', async () => {
      const { dotc, escrow, erc20_1, erc721, acc1, acc2, deployer } = await loadFixture(fixture);

      let now = await time.latest();
      let offerId = 0;

      const amountIn = 43;
      const amountOut = BigNumber.from(1);

      const decimals_1 = await erc20_1.decimals();
      const decimals_2 = 1;
      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_1));

      await erc20_1.transfer(acc1.address, amountIn_asset);
      await erc721['safeTransferFrom(address,address,uint256)'](deployer.address, acc2.address, 4);

      await erc20_1.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
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
        assetAddress: erc20_1.address,
        amount: standardizeNumber(amountIn_asset, decimals_1),
        tokenId: 0,
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
        maker: acc2.address,
        isFullyTaken: false,
        depositAsset: WithdrawalAssetERC721_standardized,
        withdrawalAsset: DepositAssetERC20_standardized,
        availableAmount: WithdrawalAssetERC721_standardized.amount,
        unitPrice: BigNumber.from(DepositAssetERC20_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_1))
          .div(BigNumber.from(WithdrawalAssetERC721_standardized.amount)),
        offer: Offer,
      };

      const make_offer = await dotc
        .connect(acc2)
        .makeOffer(WithdrawalAssetERC721, DepositAssetERC20, AwaitingOffer.offer);

      await expect(make_offer).to.emit(dotc, 'CreatedOffer');
      await expect(make_offer)
        .to.emit(escrow, 'OfferDeposited')
        .withArgs(offerId, acc2.address, WithdrawalAssetERC721.amount);

      expect(await dotc.currentOfferId()).to.be.eq(offerId + 1);
      expect(await erc721.ownerOf(WithdrawalAssetERC721.tokenId)).to.eq(escrow.address);

      expect(await dotc.offersFromAddress(acc2.address, offerId)).to.eq(0);

      expect((await dotc.allOffers(0)).offer.isFullType).to.eq(AwaitingOffer.offer.isFullType);
      expect((await dotc.allOffers(0)).maker).to.eq(AwaitingOffer.maker);
      expect((await dotc.allOffers(0)).isFullyTaken).to.eq(AwaitingOffer.isFullyTaken);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(AwaitingOffer.availableAmount);
      expect((await dotc.allOffers(0)).unitPrice).to.eq(AwaitingOffer.unitPrice);
      expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq(AwaitingOffer.offer.specialAddresses);
      expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(AwaitingOffer.offer.expiryTimestamp);
      expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(AwaitingOffer.offer.timelockPeriod);
      expect((await dotc.allOffers(0)).offer.terms).to.eq(AwaitingOffer.offer.terms);
      expect((await dotc.allOffers(0)).offer.commsLink).to.eq(AwaitingOffer.offer.commsLink);

      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(WithdrawalAssetERC721.amount);
      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(WithdrawalAssetERC721.assetAddress);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(WithdrawalAssetERC721.assetType);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(WithdrawalAssetERC721.tokenId);

      offerId++;
    });

    it('Should make full offer (erc20 => erc1155)', async () => {
      const { dotc, escrow, erc20_1, erc1155, acc1, acc2, deployer } = await loadFixture(fixture);

      let now = await time.latest();
      let offerId = 0;

      const amountIn = 43;
      const amountOut = BigNumber.from(202);

      const decimals_1 = await erc20_1.decimals();
      const decimals_2 = 1;
      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_1));

      await erc20_1.transfer(acc1.address, amountIn_asset);
      await erc1155.safeTransferFrom(deployer.address, acc2.address, 3, 202, '0x00');

      await erc20_1.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: 202,
        tokenId: 3,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: standardizeNumber(amountIn_asset, decimals_1),
        tokenId: 0,
      };

      const WithdrawalAssetERC1155_standardized: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: amountOut,
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
        maker: acc1.address,
        isFullyTaken: false,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC1155_standardized,
        availableAmount: DepositAssetERC20_standardized.amount,
        unitPrice: BigNumber.from(WithdrawalAssetERC1155_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_1))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
        offer: Offer,
      };

      const make_offer = await dotc
        .connect(acc1)
        .makeOffer(DepositAssetERC20, WithdrawalAssetERC1155, AwaitingOffer.offer);

      await expect(make_offer).to.emit(dotc, 'CreatedOffer');
      await expect(make_offer)
        .to.emit(escrow, 'OfferDeposited')
        .withArgs(offerId, acc1.address, DepositAssetERC20.amount);

      expect(await dotc.currentOfferId()).to.be.eq(offerId + 1);
      expect(await erc20_1.balanceOf(escrow.address)).to.eq(amountIn_asset);

      expect(await dotc.offersFromAddress(acc1.address, offerId)).to.eq(0);

      expect((await dotc.allOffers(0)).offer.isFullType).to.eq(AwaitingOffer.offer.isFullType);
      expect((await dotc.allOffers(0)).maker).to.eq(AwaitingOffer.maker);
      expect((await dotc.allOffers(0)).isFullyTaken).to.eq(AwaitingOffer.isFullyTaken);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(AwaitingOffer.availableAmount);
      expect((await dotc.allOffers(0)).unitPrice).to.eq(AwaitingOffer.unitPrice);
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
      const { dotc, escrow, erc20_1, erc1155, acc1, acc2, deployer } = await loadFixture(fixture);

      let now = await time.latest();
      let offerId = 0;

      const amountIn = 43;
      const amountOut = BigNumber.from(202);

      const decimals_1 = await erc20_1.decimals();
      const decimals_2 = 1;
      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_1));

      await erc20_1.transfer(acc1.address, amountIn_asset);
      await erc1155.safeTransferFrom(deployer.address, acc2.address, 3, 202, '0x00');

      await erc20_1.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: 202,
        tokenId: 3,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: standardizeNumber(amountIn_asset, decimals_1),
        tokenId: 0,
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
        maker: acc2.address,
        isFullyTaken: false,
        depositAsset: WithdrawalAssetERC1155_standardized,
        withdrawalAsset: DepositAssetERC20_standardized,
        availableAmount: WithdrawalAssetERC1155_standardized.amount,
        unitPrice: BigNumber.from(DepositAssetERC20_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_1))
          .div(BigNumber.from(WithdrawalAssetERC1155_standardized.amount)),
        offer: Offer,
      };

      const make_offer = await dotc
        .connect(acc2)
        .makeOffer(WithdrawalAssetERC1155, DepositAssetERC20, AwaitingOffer.offer);

      await expect(make_offer).to.emit(dotc, 'CreatedOffer');
      await expect(make_offer)
        .to.emit(escrow, 'OfferDeposited')
        .withArgs(offerId, acc2.address, WithdrawalAssetERC1155.amount);

      expect(await dotc.currentOfferId()).to.be.eq(offerId + 1);
      expect(await erc1155.balanceOf(escrow.address, WithdrawalAssetERC1155.tokenId)).to.eq(
        WithdrawalAssetERC1155.amount,
      );

      expect(await dotc.offersFromAddress(acc2.address, offerId)).to.eq(0);

      expect((await dotc.allOffers(0)).offer.isFullType).to.eq(AwaitingOffer.offer.isFullType);
      expect((await dotc.allOffers(0)).maker).to.eq(AwaitingOffer.maker);
      expect((await dotc.allOffers(0)).isFullyTaken).to.eq(AwaitingOffer.isFullyTaken);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(AwaitingOffer.availableAmount);
      expect((await dotc.allOffers(0)).unitPrice).to.eq(AwaitingOffer.unitPrice);
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
      const { dotc, escrow, erc721, acc1, acc2, deployer } = await loadFixture(fixture);

      let now = await time.latest();
      let offerId = 0;

      const amount = BigNumber.from(1);
      const decimals = 1;

      await erc721['safeTransferFrom(address,address,uint256)'](deployer.address, acc1.address, 2);
      await erc721['safeTransferFrom(address,address,uint256)'](deployer.address, acc2.address, 4);

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
        maker: acc1.address,
        isFullyTaken: false,
        depositAsset: DepositAssetERC721_standardized,
        withdrawalAsset: WithdrawalAssetERC721_standardized,
        availableAmount: DepositAssetERC721_standardized.amount,
        unitPrice: BigNumber.from(WithdrawalAssetERC721_standardized.amount)
          .mul(ethers.utils.parseEther('1'))
          .div(BigNumber.from(DepositAssetERC721_standardized.amount)),
        offer: Offer,
      };

      const make_offer = await dotc
        .connect(acc1)
        .makeOffer(DepositAssetERC721, WithdrawalAssetERC721, AwaitingOffer.offer);

      await expect(make_offer).to.emit(dotc, 'CreatedOffer');
      await expect(make_offer)
        .to.emit(escrow, 'OfferDeposited')
        .withArgs(offerId, acc1.address, DepositAssetERC721.amount);

      expect(await dotc.currentOfferId()).to.be.eq(offerId + 1);
      expect(await erc721.ownerOf(2)).to.eq(escrow.address);

      expect(await dotc.offersFromAddress(acc1.address, offerId)).to.eq(0);

      expect((await dotc.allOffers(0)).offer.isFullType).to.eq(AwaitingOffer.offer.isFullType);
      expect((await dotc.allOffers(0)).maker).to.eq(AwaitingOffer.maker);
      expect((await dotc.allOffers(0)).isFullyTaken).to.eq(AwaitingOffer.isFullyTaken);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(AwaitingOffer.availableAmount);
      expect((await dotc.allOffers(0)).unitPrice).to.eq(AwaitingOffer.unitPrice);
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
      const { dotc, escrow, erc1155, acc1, acc2, deployer } = await loadFixture(fixture);

      let now = await time.latest();
      let offerId = 0;

      const amountIn = BigNumber.from(42);
      const amountOut = BigNumber.from(202);

      const decimals = 1;

      await erc1155.safeTransferFrom(deployer.address, acc1.address, 5, 202, '0x00');
      await erc1155.safeTransferFrom(deployer.address, acc2.address, 3, 202, '0x00');

      await erc1155.connect(acc1).setApprovalForAll(dotc.address, true);
      await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: 42,
        tokenId: 5,
      };

      const WithdrawalAssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: 202,
        tokenId: 3,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: amountIn,
        tokenId: 5,
      };

      const WithdrawalAssetERC1155_standardized: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: amountOut,
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
        maker: acc1.address,
        isFullyTaken: false,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC1155_standardized,
        availableAmount: DepositAssetERC20_standardized.amount,
        unitPrice: BigNumber.from(WithdrawalAssetERC1155_standardized.amount)
          .mul(ethers.utils.parseEther('1'))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
        offer: Offer,
      };

      const make_offer = await dotc
        .connect(acc1)
        .makeOffer(DepositAssetERC1155, WithdrawalAssetERC1155, AwaitingOffer.offer);

      await expect(make_offer).to.emit(dotc, 'CreatedOffer');
      await expect(make_offer)
        .to.emit(escrow, 'OfferDeposited')
        .withArgs(offerId, acc1.address, DepositAssetERC1155.amount);

      expect(await dotc.currentOfferId()).to.be.eq(offerId + 1);
      expect(await erc1155.balanceOf(escrow.address, DepositAssetERC1155.tokenId)).to.eq(DepositAssetERC1155.amount);

      expect(await dotc.offersFromAddress(acc1.address, offerId)).to.eq(0);

      expect((await dotc.allOffers(0)).offer.isFullType).to.eq(AwaitingOffer.offer.isFullType);
      expect((await dotc.allOffers(0)).maker).to.eq(AwaitingOffer.maker);
      expect((await dotc.allOffers(0)).isFullyTaken).to.eq(AwaitingOffer.isFullyTaken);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(AwaitingOffer.availableAmount);
      expect((await dotc.allOffers(0)).unitPrice).to.eq(AwaitingOffer.unitPrice);
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
      const { dotc, escrow, erc20_1, erc20_2, erc721, acc1, acc2 } = await loadFixture(fixture);

      let now = await time.latest();
      let offerId = 0;

      const amountIn = 43;
      const amountOut = 104;

      const decimals_1 = await erc20_1.decimals();
      const decimals_2 = await erc20_2.decimals();
      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_1));
      const amountOut_asset = BigNumber.from(amountOut).mul(BigNumber.from(10).pow(decimals_2));

      await erc20_1.transfer(acc1.address, amountIn_asset);
      await erc20_2.transfer(acc2.address, amountOut_asset);

      await erc20_1.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc20_2.connect(acc2).approve(dotc.address, amountOut_asset);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_2.address,
        amount: amountOut_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC721_false: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        amount: 204,
        tokenId: 4,
      };

      let DepositAssetERC20_false: AssetStruct = {
        assetType: 0,
        assetAddress: erc20_1.address,
        amount: amountIn_asset,
        tokenId: 0,
      };

      let WithdrawalAssetERC20_false: AssetStruct = {
        assetType: 0,
        assetAddress: erc20_2.address,
        amount: amountOut_asset,
        tokenId: 0,
      };

      const Offer: OfferStructStruct = {
        isFullType: true,
        specialAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      await expect(dotc.makeOffer(DepositAssetERC20_false, WithdrawalAssetERC20, Offer)).to.be.revertedWithCustomError(
        dotc,
        'AssetTypeUndefinedError',
      );

      DepositAssetERC20_false = {
        assetType: 1,
        assetAddress: addressZero,
        amount: amountIn_asset,
        tokenId: 0,
      };

      await expect(dotc.makeOffer(DepositAssetERC20_false, WithdrawalAssetERC20, Offer)).to.be.revertedWithCustomError(
        dotc,
        'AssetAddressIsZeroError',
      );

      DepositAssetERC20_false = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: 0,
        tokenId: 0,
      };

      await expect(dotc.makeOffer(DepositAssetERC20_false, WithdrawalAssetERC20, Offer)).to.be.revertedWithCustomError(
        dotc,
        'AssetAmountIsZeroError',
      );

      await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20_false, Offer)).to.be.revertedWithCustomError(
        dotc,
        'AssetTypeUndefinedError',
      );

      WithdrawalAssetERC20_false = {
        assetType: 1,
        assetAddress: addressZero,
        amount: amountOut_asset,
        tokenId: 0,
      };

      await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20_false, Offer)).to.be.revertedWithCustomError(
        dotc,
        'AssetAddressIsZeroError',
      );

      WithdrawalAssetERC20_false = {
        assetType: 1,
        assetAddress: erc20_2.address,
        amount: 0,
        tokenId: 0,
      };

      await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC20_false, Offer)).to.be.revertedWithCustomError(
        dotc,
        'AssetAmountIsZeroError',
      );

      await expect(dotc.makeOffer(DepositAssetERC20, WithdrawalAssetERC721_false, Offer)).to.be.revertedWithCustomError(
        dotc,
        'ERC721AmountExceedsOneError',
      );
      await expect(dotc.makeOffer(WithdrawalAssetERC721_false, DepositAssetERC20, Offer)).to.be.revertedWithCustomError(
        dotc,
        'ERC721AmountExceedsOneError',
      );
    });
  });

  describe('Take Offer', () => {
    it('Should take full offer (erc20 => erc20)', async () => {
      const { dotc, escrow, dotcManager, erc20_1, erc20_2, acc1, acc2, acc3, deployer } = await loadFixture(fixture);

      let now = await time.latest();
      let offerId = 0;

      const amountIn = 43;
      const amountOut = 104;

      const decimals_1 = await erc20_1.decimals();
      const decimals_2 = await erc20_2.decimals();
      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_1));
      const amountOut_asset = BigNumber.from(amountOut).mul(BigNumber.from(10).pow(decimals_2));

      await erc20_1.transfer(acc1.address, amountIn_asset);
      await erc20_2.transfer(acc2.address, amountOut_asset);

      await erc20_1.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc20_2.connect(acc2).approve(dotc.address, amountOut_asset);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_2.address,
        amount: amountOut_asset,
        tokenId: 0,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: standardizeNumber(amountIn_asset, decimals_1),
        tokenId: 0,
      };

      const WithdrawalAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_2.address,
        amount: standardizeNumber(amountOut_asset, decimals_2),
        tokenId: 0,
      };

      let Offer: OfferStructStruct = {
        isFullType: true,
        specialAddresses: [acc2.address, deployer.address],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      const AwaitingOffer: DotcOfferStruct = {
        maker: acc1.address,
        isFullyTaken: true,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC20_standardized,
        availableAmount: 0,
        unitPrice: BigNumber.from(WithdrawalAssetERC20_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_1))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
        offer: Offer,
      };

      const fees = BigNumber.from(WithdrawalAssetERC20.amount)
        .mul(await dotcManager.feeAmount())
        .div(await dotcManager.BPS());
      const deployerBalance_2 = await erc20_2.balanceOf(deployer.address);

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

      await expect(dotc.connect(acc3).takeOffer(offerId, WithdrawalAssetERC20.amount)).to.be.revertedWithCustomError(
        dotc,
        'NotSpecialAddressError',
      );
      // Checks if threw another message (that is lower in hirarchy) than 'Dotc: Only Special addresses allowed to take offer' then special addresses works correctly
      await expect(dotc.connect(deployer).takeOffer(offerId, WithdrawalAssetERC20.amount)).to.be.revertedWith(
        'ERC20: insufficient allowance',
      );
      await expect(dotc.connect(acc2).takeOffer(offerId, 0)).to.be.revertedWithCustomError(dotcManager, 'ZeroAmountPassed');

      const take_offer = await dotc.connect(acc2).takeOffer(offerId, WithdrawalAssetERC20.amount);

      await expect(take_offer)
        .to.emit(dotc, 'TakenOffer')
        .withArgs(offerId, acc2.address, true, DepositAssetERC20_standardized.amount, WithdrawalAssetERC20.amount);
      await expect(take_offer)
        .to.emit(escrow, 'OfferWithdrawn')
        .withArgs(offerId, acc2.address, DepositAssetERC20.amount);

      expect(await erc20_1.balanceOf(escrow.address)).to.eq(0);
      expect(await erc20_1.balanceOf(acc2.address)).to.eq(DepositAssetERC20.amount);
      expect(await erc20_2.balanceOf(acc1.address)).to.eq(BigNumber.from(WithdrawalAssetERC20.amount).sub(fees));
      expect(await erc20_2.balanceOf(deployer.address)).to.eq(BigNumber.from(deployerBalance_2).add(fees));

      expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
      expect((await dotc.allOffers(0)).isFullyTaken).to.eq(AwaitingOffer.isFullyTaken);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(AwaitingOffer.availableAmount);

      expect(await dotc.offersFromAddress(acc1.address, 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);

      await expect(dotc.connect(acc2).takeOffer(50, WithdrawalAssetERC20.amount)).to.be.revertedWithCustomError(
        dotc,
        'OfferValidityError',
      );
      await expect(dotc.connect(acc2).takeOffer(offerId, WithdrawalAssetERC20.amount)).to.be.revertedWithCustomError(
        dotc,
        'OfferValidityError',
      );

      await expect(dotc.connect(acc1).updateOffer(offerId, 0, Offer)).to.be.revertedWithCustomError(
        dotc,
        'OfferValidityError',
      );
      await expect(dotc.connect(acc1).cancelOffer(offerId)).to.be.revertedWithCustomError(dotc, 'OfferValidityError');

      offerId++;

      await time.increase(20);

      await erc20_1.transfer(acc1.address, amountIn_asset);
      await erc20_2.transfer(acc2.address, amountOut_asset);

      await erc20_1.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc20_2.connect(acc2).approve(dotc.address, amountOut_asset);

      now = (await time.latest()) + 20;

      Offer.expiryTimestamp = now;
      AwaitingOffer.offer = Offer;

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

      await time.increase(200);

      await expect(dotc.connect(acc2).takeOffer(offerId, WithdrawalAssetERC20.amount)).to.be.revertedWithCustomError(
        dotc,
        'OfferExpiredError',
      );
    });

    it('Should take partial offer (erc20 => erc20)', async () => {
      const { dotc, escrow, dotcManager, erc20_1, erc20_2, acc1, acc2, deployer } = await loadFixture(fixture);

      let now = await time.latest();
      let offerId = 0;

      const amountIn = 43;
      const amountOut = 104;

      const decimals_1 = await erc20_1.decimals();
      const decimals_2 = await erc20_2.decimals();
      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_1));
      const amountOut_asset = BigNumber.from(amountOut).mul(BigNumber.from(10).pow(decimals_2));
      const amountOut_to_take = BigNumber.from(amountOut - 50).mul(BigNumber.from(10).pow(decimals_2));

      const standardized_amountOut_to_take = standardizeNumber(amountOut_to_take, decimals_2);

      await erc20_1.transfer(acc1.address, amountIn_asset);
      await erc20_2.transfer(acc2.address, amountOut_asset);

      await erc20_1.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc20_2.connect(acc2).approve(dotc.address, amountOut_asset);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_2.address,
        amount: amountOut_asset,
        tokenId: 0,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: standardizeNumber(amountIn_asset, decimals_1),
        tokenId: 0,
      };

      const WithdrawalAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_2.address,
        amount: standardizeNumber(amountOut_asset, decimals_2),
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
        maker: acc1.address,
        isFullyTaken: false,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC20_standardized,
        availableAmount: DepositAssetERC20_standardized.amount,
        unitPrice: BigNumber.from(WithdrawalAssetERC20_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_1))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
        offer: Offer,
      };

      const fees = BigNumber.from(amountOut_to_take)
        .mul(await dotcManager.feeAmount())
        .div(await dotcManager.BPS());
      const deployerBalance_2 = await erc20_2.balanceOf(deployer.address);

      const amountToWitdraw = standardized_amountOut_to_take
        .mul(BigNumber.from(10).pow(await dotcManager.DECIMALS()))
        .div(BigNumber.from(AwaitingOffer.unitPrice));
      const realAmount = unstandardizeNumber(amountToWitdraw, await erc20_1.decimals());

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

      const balance = await erc20_1.balanceOf(escrow.address);

      const take_offer = await dotc.connect(acc2).takeOffer(offerId, amountOut_to_take);

      await expect(take_offer)
        .to.emit(dotc, 'TakenOffer')
        .withArgs(offerId, acc2.address, false, realAmount, amountOut_to_take);
      await expect(take_offer).to.emit(escrow, 'OfferWithdrawn').withArgs(offerId, acc2.address, realAmount);

      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(balance.sub(realAmount));
      expect(await erc20_1.balanceOf(escrow.address)).to.eq(balance.sub(realAmount));
      expect(await erc20_1.balanceOf(acc2.address)).to.eq(realAmount);
      expect(await erc20_2.balanceOf(acc1.address)).to.eq(BigNumber.from(amountOut_to_take).sub(fees));
      expect(await erc20_2.balanceOf(deployer.address)).to.eq(BigNumber.from(deployerBalance_2).add(fees));

      expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(
        standardizeNumber(BigNumber.from(50).mul(BigNumber.from(10).pow(decimals_2)), decimals_2),
      );
      expect((await dotc.allOffers(0)).isFullyTaken).to.eq(AwaitingOffer.isFullyTaken);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(
        BigNumber.from(AwaitingOffer.availableAmount).sub(amountToWitdraw),
      );

      expect(await dotc.offersFromAddress(acc1.address, 0)).to.eq(offerId);

      offerId++;
    });

    it('Should take partial offer fully (erc20 => erc20)', async () => {
      const { dotc, escrow, dotcManager, erc20_1, erc20_2, acc1, acc2, deployer } = await loadFixture(fixture);

      let now = await time.latest();
      let offerId = 0;

      const amountIn = 43;
      const amountOut = 104;

      const decimals_1 = await erc20_1.decimals();
      const decimals_2 = await erc20_2.decimals();
      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_1));
      const amountOut_asset = BigNumber.from(amountOut).mul(BigNumber.from(10).pow(decimals_2));

      await erc20_1.transfer(acc1.address, amountIn_asset);
      await erc20_2.transfer(acc2.address, amountOut_asset);

      await erc20_1.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc20_2.connect(acc2).approve(dotc.address, amountOut_asset);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_2.address,
        amount: amountOut_asset,
        tokenId: 0,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: standardizeNumber(amountIn_asset, decimals_1),
        tokenId: 0,
      };

      const WithdrawalAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_2.address,
        amount: standardizeNumber(amountOut_asset, decimals_2),
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
        maker: acc1.address,
        isFullyTaken: true,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC20_standardized,
        availableAmount: DepositAssetERC20_standardized.amount,
        unitPrice: BigNumber.from(WithdrawalAssetERC20_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_1))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
        offer: Offer,
      };

      const fees = BigNumber.from(amountOut_asset)
        .mul(await dotcManager.feeAmount())
        .div(await dotcManager.BPS());
      const deployerBalance_2 = await erc20_2.balanceOf(deployer.address);

      const amountToWitdraw = BigNumber.from(WithdrawalAssetERC20_standardized.amount)
        .mul(BigNumber.from(10).pow(await dotcManager.DECIMALS()))
        .div(BigNumber.from(AwaitingOffer.unitPrice));
      const realAmount = unstandardizeNumber(amountToWitdraw, await erc20_1.decimals());

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

      const balance = await erc20_1.balanceOf(escrow.address);

      const take_offer = await dotc.connect(acc2).takeOffer(offerId, WithdrawalAssetERC20.amount);

      await expect(take_offer)
        .to.emit(dotc, 'TakenOffer')
        .withArgs(offerId, acc2.address, true, DepositAssetERC20.amount, WithdrawalAssetERC20.amount);

      await expect(take_offer)
        .to.emit(escrow, 'OfferWithdrawn')
        .withArgs(offerId, acc2.address, DepositAssetERC20.amount);

      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(
        balance.sub(BigNumber.from(DepositAssetERC20.amount)),
      ); //0
      expect(await erc20_1.balanceOf(escrow.address)).to.eq(balance.sub(BigNumber.from(DepositAssetERC20.amount))); //0
      expect(await erc20_1.balanceOf(acc2.address)).to.eq(DepositAssetERC20.amount);
      expect(await erc20_2.balanceOf(acc1.address)).to.eq(BigNumber.from(amountOut_asset).sub(fees));
      expect(await erc20_2.balanceOf(deployer.address)).to.eq(BigNumber.from(deployerBalance_2).add(fees));

      expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
      expect((await dotc.allOffers(0)).isFullyTaken).to.eq(AwaitingOffer.isFullyTaken);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(0);

      expect(await dotc.offersFromAddress(acc1.address, 0)).to.eq(offerId);

      offerId++;
    });

    it('Should take full offer (erc20 => erc721)', async () => {
      const { dotc, escrow, dotcManager, erc20_1, erc721, acc1, acc2, deployer } = await loadFixture(fixture);

      let now = await time.latest();
      let offerId = 0;

      const amountIn = 43;
      const amountOut = BigNumber.from(1);

      const decimals_1 = await erc20_1.decimals();
      const decimals_2 = 1;
      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_1));

      await erc20_1.transfer(acc1.address, amountIn_asset);
      await erc721['safeTransferFrom(address,address,uint256)'](deployer.address, acc2.address, 4);

      await erc20_1.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
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
        assetAddress: erc20_1.address,
        amount: standardizeNumber(amountIn_asset, decimals_1),
        tokenId: 0,
      };

      const WithdrawalAssetERC721_standardized: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        amount: standardizeNumber(amountOut, decimals_2),
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
        maker: acc1.address,
        isFullyTaken: true,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC721_standardized,
        availableAmount: DepositAssetERC20_standardized.amount,
        unitPrice: BigNumber.from(WithdrawalAssetERC721_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_1))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
        offer: Offer,
      };

      const fees = BigNumber.from(DepositAssetERC20_standardized.amount)
        .mul(await dotcManager.feeAmount())
        .div(await dotcManager.BPS());
      const outAmount = unstandardizeNumber(
        BigNumber.from(AwaitingOffer.depositAsset.amount).sub(fees),
        await erc20_1.decimals(),
      );

      const deployerBalance_2 = await erc20_1.balanceOf(deployer.address);

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC721, AwaitingOffer.offer);

      const take_offer = await dotc.connect(acc2).takeOffer(offerId, 0);

      await expect(take_offer)
        .to.emit(dotc, 'TakenOffer')
        .withArgs(offerId, acc2.address, AwaitingOffer.isFullyTaken, AwaitingOffer.depositAsset.amount, 0);
      await expect(take_offer).to.emit(escrow, 'OfferWithdrawn').withArgs(offerId, acc2.address, outAmount);

      expect(await erc20_1.balanceOf(escrow.address)).to.eq(0);
      expect(await erc20_1.balanceOf(acc2.address)).to.eq(outAmount);
      expect(await erc20_1.balanceOf(deployer.address)).to.eq(
        BigNumber.from(deployerBalance_2).add(unstandardizeNumber(fees, await erc20_1.decimals())),
      );
      expect(await erc721.ownerOf(WithdrawalAssetERC721.tokenId)).to.eq(acc1.address);

      expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
      expect((await dotc.allOffers(0)).isFullyTaken).to.eq(AwaitingOffer.isFullyTaken);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(0);

      expect(await dotc.offersFromAddress(acc1.address, 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);

      offerId++;
    });

    it('Should take full offer (erc721 => erc20)', async () => {
      const { dotc, escrow, dotcManager, erc20_1, erc721, acc1, acc2, deployer } = await loadFixture(fixture);

      let now = await time.latest();
      let offerId = 0;

      const amountIn = 43;
      const amountOut = BigNumber.from(1);

      const decimals_1 = await erc20_1.decimals();
      const decimals_2 = 1;
      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_1));

      await erc20_1.transfer(acc1.address, amountIn_asset);
      await erc721['safeTransferFrom(address,address,uint256)'](deployer.address, acc2.address, 4);

      await erc20_1.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
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
        assetAddress: erc20_1.address,
        amount: standardizeNumber(amountIn_asset, decimals_1),
        tokenId: 0,
      };

      const WithdrawalAssetERC721_standardized: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        amount: standardizeNumber(amountOut, decimals_2),
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
        maker: acc2.address,
        isFullyTaken: true,
        depositAsset: WithdrawalAssetERC721_standardized,
        withdrawalAsset: DepositAssetERC20_standardized,
        availableAmount: WithdrawalAssetERC721_standardized.amount,
        unitPrice: BigNumber.from(DepositAssetERC20_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_1))
          .div(BigNumber.from(WithdrawalAssetERC721_standardized.amount)),
        offer: Offer,
      };

      const fees = BigNumber.from(DepositAssetERC20.amount)
        .mul(await dotcManager.feeAmount())
        .div(await dotcManager.BPS());
      const deployerBalance_2 = await erc20_1.balanceOf(deployer.address);

      await dotc.connect(acc2).makeOffer(WithdrawalAssetERC721, DepositAssetERC20, AwaitingOffer.offer);

      const take_offer = await dotc.connect(acc1).takeOffer(offerId, DepositAssetERC20.amount);

      await expect(take_offer)
        .to.emit(dotc, 'TakenOffer')
        .withArgs(offerId, acc1.address, true, 1, DepositAssetERC20.amount);
      await expect(take_offer).to.emit(escrow, 'OfferWithdrawn').withArgs(offerId, acc1.address, 1);

      expect(await erc721.balanceOf(escrow.address)).to.eq(0);
      expect(await erc721.ownerOf(WithdrawalAssetERC721.tokenId)).to.eq(acc1.address);

      expect(await erc20_1.balanceOf(acc2.address)).to.eq(BigNumber.from(DepositAssetERC20.amount).sub(fees));
      expect(await erc20_1.balanceOf(deployer.address)).to.eq(BigNumber.from(deployerBalance_2).add(fees));

      expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
      expect((await dotc.allOffers(0)).isFullyTaken).to.eq(AwaitingOffer.isFullyTaken);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(0);

      expect(await dotc.offersFromAddress(acc2.address, 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);

      offerId++;
    });

    it('Should take full offer (erc20 => erc1155)', async () => {
      const { dotc, escrow, dotcManager, erc20_1, erc1155, acc1, acc2, deployer } = await loadFixture(fixture);

      let now = await time.latest();
      let offerId = 0;

      const amountIn = 43;
      const amountOut = BigNumber.from(202);

      const decimals_1 = await erc20_1.decimals();
      const decimals_2 = 1;
      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_1));

      await erc20_1.transfer(acc1.address, amountIn_asset);
      await erc1155.safeTransferFrom(deployer.address, acc2.address, 3, 202, '0x00');

      await erc20_1.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: 202,
        tokenId: 3,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: standardizeNumber(amountIn_asset, decimals_1),
        tokenId: 0,
      };

      const WithdrawalAssetERC1155_standardized: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: standardizeNumber(amountOut, decimals_2),
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
        maker: acc1.address,
        isFullyTaken: true,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC1155_standardized,
        availableAmount: DepositAssetERC20_standardized.amount,
        unitPrice: BigNumber.from(WithdrawalAssetERC1155_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_1))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
        offer: Offer,
      };

      const fees = BigNumber.from(DepositAssetERC20_standardized.amount)
        .mul(await dotcManager.feeAmount())
        .div(await dotcManager.BPS());
      const outAmount = unstandardizeNumber(
        BigNumber.from(AwaitingOffer.depositAsset.amount).sub(fees),
        await erc20_1.decimals(),
      );

      const deployerBalance_2 = await erc20_1.balanceOf(deployer.address);

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC1155, AwaitingOffer.offer);

      const take_offer = await dotc.connect(acc2).takeOffer(offerId, 0);

      await expect(take_offer)
        .to.emit(dotc, 'TakenOffer')
        .withArgs(offerId, acc2.address, AwaitingOffer.isFullyTaken, AwaitingOffer.depositAsset.amount, 0);
      await expect(take_offer).to.emit(escrow, 'OfferWithdrawn').withArgs(offerId, acc2.address, outAmount);

      expect(await erc20_1.balanceOf(escrow.address)).to.eq(0);
      expect(await erc20_1.balanceOf(acc2.address)).to.eq(outAmount);
      expect(await erc20_1.balanceOf(deployer.address)).to.eq(
        BigNumber.from(deployerBalance_2).add(unstandardizeNumber(fees, await erc20_1.decimals())),
      );
      expect(await erc1155.balanceOf(acc1.address, WithdrawalAssetERC1155.tokenId)).to.eq(
        WithdrawalAssetERC1155.amount,
      );

      expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
      expect((await dotc.allOffers(0)).isFullyTaken).to.eq(AwaitingOffer.isFullyTaken);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(0);

      expect(await dotc.offersFromAddress(acc1.address, 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);

      offerId++;
    });

    it('Should take full offer (erc1155 => erc20)', async () => {
      const { dotc, escrow, dotcManager, erc20_1, erc1155, acc1, acc2, deployer } = await loadFixture(fixture);

      let now = await time.latest();
      let offerId = 0;

      const amountIn = 43;
      const amountOut = BigNumber.from(202);

      const decimals_1 = await erc20_1.decimals();
      const decimals_2 = 1;
      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_1));

      await erc20_1.transfer(acc1.address, amountIn_asset);
      await erc1155.safeTransferFrom(deployer.address, acc2.address, 3, 202, '0x00');

      await erc20_1.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: 202,
        tokenId: 3,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: standardizeNumber(amountIn_asset, decimals_1),
        tokenId: 0,
      };

      const WithdrawalAssetERC1155_standardized: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: standardizeNumber(amountOut, decimals_2),
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
        maker: acc2.address,
        isFullyTaken: true,
        depositAsset: WithdrawalAssetERC1155_standardized,
        withdrawalAsset: DepositAssetERC20_standardized,
        availableAmount: WithdrawalAssetERC1155_standardized.amount,
        unitPrice: BigNumber.from(DepositAssetERC20_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_1))
          .div(BigNumber.from(WithdrawalAssetERC1155_standardized.amount)),
        offer: Offer,
      };

      const fees = BigNumber.from(DepositAssetERC20.amount)
        .mul(await dotcManager.feeAmount())
        .div(await dotcManager.BPS());
      const deployerBalance_2 = await erc20_1.balanceOf(deployer.address);

      await dotc.connect(acc2).makeOffer(WithdrawalAssetERC1155, DepositAssetERC20, AwaitingOffer.offer);

      const take_offer = await dotc.connect(acc1).takeOffer(offerId, DepositAssetERC20.amount);

      await expect(take_offer)
        .to.emit(dotc, 'TakenOffer')
        .withArgs(offerId, acc1.address, true, WithdrawalAssetERC1155.amount, DepositAssetERC20.amount);
      await expect(take_offer)
        .to.emit(escrow, 'OfferWithdrawn')
        .withArgs(offerId, acc1.address, WithdrawalAssetERC1155.amount);

      expect(await erc1155.balanceOf(escrow.address, WithdrawalAssetERC1155.tokenId)).to.eq(0);
      expect(await erc1155.balanceOf(acc1.address, WithdrawalAssetERC1155.tokenId)).to.eq(
        WithdrawalAssetERC1155.amount,
      );

      expect(await erc20_1.balanceOf(acc2.address)).to.eq(BigNumber.from(DepositAssetERC20.amount).sub(fees));
      expect(await erc20_1.balanceOf(deployer.address)).to.eq(BigNumber.from(deployerBalance_2).add(fees));

      expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
      expect((await dotc.allOffers(0)).isFullyTaken).to.eq(AwaitingOffer.isFullyTaken);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(0);

      expect(await dotc.offersFromAddress(acc2.address, 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);

      offerId++;
    });

    it('Should take full offer (erc721 => erc721)', async () => {
      const { dotc, escrow, erc721, acc1, acc2, deployer } = await loadFixture(fixture);

      let now = await time.latest();
      let offerId = 0;

      const amount = BigNumber.from(1);
      const decimals = 1;

      await erc721['safeTransferFrom(address,address,uint256)'](deployer.address, acc1.address, 2);
      await erc721['safeTransferFrom(address,address,uint256)'](deployer.address, acc2.address, 4);

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
        maker: acc1.address,
        isFullyTaken: true,
        depositAsset: DepositAssetERC721_standardized,
        withdrawalAsset: WithdrawalAssetERC721_standardized,
        availableAmount: DepositAssetERC721_standardized.amount,
        unitPrice: BigNumber.from(WithdrawalAssetERC721_standardized.amount)
          .mul(ethers.utils.parseEther('1'))
          .div(BigNumber.from(DepositAssetERC721_standardized.amount)),
        offer: Offer,
      };

      await dotc.connect(acc1).makeOffer(DepositAssetERC721, WithdrawalAssetERC721, AwaitingOffer.offer);

      const take_offer = await dotc.connect(acc2).takeOffer(offerId, 0);

      await expect(take_offer)
        .to.emit(dotc, 'TakenOffer')
        .withArgs(offerId, acc2.address, AwaitingOffer.isFullyTaken, AwaitingOffer.depositAsset.amount, 0);
      await expect(take_offer).to.emit(escrow, 'OfferWithdrawn').withArgs(offerId, acc2.address, 1);

      expect(await erc721.balanceOf(escrow.address)).to.eq(0);
      expect(await erc721.ownerOf(DepositAssetERC721.tokenId)).to.eq(acc2.address);
      expect(await erc721.ownerOf(WithdrawalAssetERC721.tokenId)).to.eq(acc1.address);

      expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
      expect((await dotc.allOffers(0)).isFullyTaken).to.eq(AwaitingOffer.isFullyTaken);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(0);

      expect(await dotc.offersFromAddress(acc1.address, 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);

      offerId++;
    });

    it('Should take full offer (erc1155 => erc1155)', async () => {
      const { dotc, escrow, erc1155, acc1, acc2, deployer } = await loadFixture(fixture);

      let now = await time.latest();
      let offerId = 0;

      const amountIn = BigNumber.from(42);
      const amountOut = BigNumber.from(202);

      const decimals = 1;

      await erc1155.safeTransferFrom(deployer.address, acc1.address, 5, 202, '0x00');
      await erc1155.safeTransferFrom(deployer.address, acc2.address, 3, 202, '0x00');

      await erc1155.connect(acc1).setApprovalForAll(dotc.address, true);
      await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: 42,
        tokenId: 5,
      };

      const WithdrawalAssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
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
        maker: acc1.address,
        isFullyTaken: true,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC1155_standardized,
        availableAmount: DepositAssetERC20_standardized.amount,
        unitPrice: BigNumber.from(WithdrawalAssetERC1155_standardized.amount)
          .mul(ethers.utils.parseEther('1'))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
        offer: Offer,
      };

      await dotc.connect(acc1).makeOffer(DepositAssetERC1155, WithdrawalAssetERC1155, AwaitingOffer.offer);

      const take_offer = await dotc.connect(acc2).takeOffer(offerId, 0);

      await expect(take_offer)
        .to.emit(dotc, 'TakenOffer')
        .withArgs(offerId, acc2.address, AwaitingOffer.isFullyTaken, AwaitingOffer.depositAsset.amount, 0);
      await expect(take_offer)
        .to.emit(escrow, 'OfferWithdrawn')
        .withArgs(offerId, acc2.address, DepositAssetERC1155.amount);

      expect(await erc1155.balanceOf(escrow.address, DepositAssetERC1155.tokenId)).to.eq(0);
      expect(await erc1155.balanceOf(acc1.address, WithdrawalAssetERC1155.tokenId)).to.eq(
        WithdrawalAssetERC1155.amount,
      );
      expect(await erc1155.balanceOf(acc2.address, DepositAssetERC1155.tokenId)).to.eq(DepositAssetERC1155.amount);

      expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
      expect((await dotc.allOffers(0)).isFullyTaken).to.eq(AwaitingOffer.isFullyTaken);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(0);

      expect(await dotc.offersFromAddress(acc1.address, 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);

      offerId++;
    });

    it('Should take different offers', async () => {
      const { dotc, escrow, dotcManager, erc20_1, erc20_2, erc721, erc1155, deployer, acc1, acc2 } = await loadFixture(
        fixture,
      );

      let now = await time.latest();
      let offerId = 0;

      let amountIn: any = 43;
      let amountOut: any = 104;

      let decimals_1 = await erc20_1.decimals();
      let decimals_2 = await erc20_2.decimals();
      let amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_1));
      let amountOut_asset = BigNumber.from(amountOut).mul(BigNumber.from(10).pow(decimals_2));

      await erc20_1.transfer(acc1.address, amountIn_asset);
      await erc20_2.transfer(acc2.address, amountOut_asset);

      await erc20_1.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc20_2.connect(acc2).approve(dotc.address, amountOut_asset);

      let DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: amountIn_asset,
        tokenId: 0,
      };

      let WithdrawalAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_2.address,
        amount: amountOut_asset,
        tokenId: 0,
      };

      let DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: standardizeNumber(amountIn_asset, decimals_1),
        tokenId: 0,
      };

      let WithdrawalAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_2.address,
        amount: standardizeNumber(amountOut_asset, decimals_2),
        tokenId: 0,
      };

      let Offer: OfferStructStruct = {
        isFullType: true,
        specialAddresses: [],
        expiryTimestamp: now + 2000,
        timelockPeriod: 0,
        terms,
        commsLink,
      };

      let AwaitingOffer: DotcOfferStruct = {
        maker: acc1.address,
        isFullyTaken: true,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC20_standardized,
        availableAmount: DepositAssetERC20_standardized.amount,
        unitPrice: BigNumber.from(WithdrawalAssetERC20_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_1))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
        offer: Offer,
      };

      let fees = BigNumber.from(WithdrawalAssetERC20.amount)
        .mul(await dotcManager.feeAmount())
        .div(await dotcManager.BPS());
      let deployerBalance_2 = await erc20_2.balanceOf(deployer.address);

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

      let take_offer = await dotc.connect(acc2).takeOffer(offerId, WithdrawalAssetERC20.amount);

      await expect(take_offer)
        .to.emit(dotc, 'TakenOffer')
        .withArgs(offerId, acc2.address, true, DepositAssetERC20_standardized.amount, WithdrawalAssetERC20.amount);
      await expect(take_offer)
        .to.emit(escrow, 'OfferWithdrawn')
        .withArgs(offerId, acc2.address, DepositAssetERC20.amount);

      expect(await erc20_1.balanceOf(escrow.address)).to.eq(0);
      expect(await erc20_1.balanceOf(acc2.address)).to.eq(DepositAssetERC20.amount);
      expect(await erc20_2.balanceOf(acc1.address)).to.eq(BigNumber.from(WithdrawalAssetERC20.amount).sub(fees));
      expect(await erc20_2.balanceOf(deployer.address)).to.eq(BigNumber.from(deployerBalance_2).add(fees));

      expect((await dotc.allOffers(0)).withdrawalAsset.amount).to.eq(0);
      expect((await dotc.allOffers(0)).isFullyTaken).to.eq(AwaitingOffer.isFullyTaken);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(0);

      expect(await dotc.offersFromAddress(acc1.address, 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);

      offerId++;

      now = await time.latest();

      amountIn = 43;
      amountOut = 104;

      decimals_1 = await erc20_1.decimals();
      decimals_2 = await erc20_2.decimals();
      amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_1));
      amountOut_asset = BigNumber.from(amountOut).mul(BigNumber.from(10).pow(decimals_2));
      const amountOut_to_take = BigNumber.from(amountOut - 50).mul(BigNumber.from(10).pow(decimals_2));
      const standardized_amountOut_to_take = standardizeNumber(amountOut_to_take, decimals_2);

      await erc20_1.transfer(acc1.address, amountIn_asset);
      await erc20_2.transfer(acc2.address, amountOut_asset);

      await erc20_1.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc20_2.connect(acc2).approve(dotc.address, amountOut_asset);

      DepositAssetERC20 = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: amountIn_asset,
        tokenId: 0,
      };

      WithdrawalAssetERC20 = {
        assetType: 1,
        assetAddress: erc20_2.address,
        amount: amountOut_asset,
        tokenId: 0,
      };

      DepositAssetERC20_standardized = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: standardizeNumber(amountIn_asset, decimals_1),
        tokenId: 0,
      };

      WithdrawalAssetERC20_standardized = {
        assetType: 1,
        assetAddress: erc20_2.address,
        amount: standardizeNumber(amountOut_asset, decimals_2),
        tokenId: 0,
      };

      Offer.isFullType = false;

      AwaitingOffer = {
        maker: acc1.address,
        isFullyTaken: false,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC20_standardized,
        availableAmount: DepositAssetERC20_standardized.amount,
        unitPrice: BigNumber.from(WithdrawalAssetERC20_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_1))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
        offer: Offer,
      };

      fees = BigNumber.from(amountOut_to_take)
        .mul(await dotcManager.feeAmount())
        .div(await dotcManager.BPS());
      deployerBalance_2 = await erc20_2.balanceOf(deployer.address);

      let amountToWitdraw = standardized_amountOut_to_take
        .mul(BigNumber.from(10).pow(await dotcManager.DECIMALS()))
        .div(BigNumber.from(AwaitingOffer.unitPrice));
      let realAmount = unstandardizeNumber(amountToWitdraw, await erc20_1.decimals());

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

      const balance = await erc20_1.balanceOf(escrow.address);

      take_offer = await dotc.connect(acc2).takeOffer(offerId, amountOut_to_take);

      await expect(take_offer)
        .to.emit(dotc, 'TakenOffer')
        .withArgs(offerId, acc2.address, false, realAmount, amountOut_to_take);
      await expect(take_offer).to.emit(escrow, 'OfferWithdrawn').withArgs(offerId, acc2.address, realAmount);

      offerId++;

      now = await time.latest();

      amountIn = 43;
      amountOut = BigNumber.from(1);

      decimals_1 = await erc20_1.decimals();
      decimals_2 = 1;
      amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_1));

      await erc20_1.transfer(acc1.address, amountIn_asset);
      await erc721['safeTransferFrom(address,address,uint256)'](deployer.address, acc2.address, 4);

      await erc20_1.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

      DepositAssetERC20 = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: amountIn_asset,
        tokenId: 0,
      };

      let WithdrawalAssetERC721 = {
        assetType: 2,
        assetAddress: erc721.address,
        amount: 1,
        tokenId: 4,
      };

      DepositAssetERC20_standardized = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: standardizeNumber(amountIn_asset, decimals_1),
        tokenId: 0,
      };

      let WithdrawalAssetERC721_standardized = {
        assetType: 2,
        assetAddress: erc721.address,
        amount: standardizeNumber(amountOut, decimals_2),
        tokenId: 4,
      };

      Offer.isFullType = true;

      AwaitingOffer = {
        maker: acc1.address,
        isFullyTaken: true,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC721_standardized,
        availableAmount: DepositAssetERC20_standardized.amount,
        unitPrice: BigNumber.from(WithdrawalAssetERC721_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_1))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
        offer: Offer,
      };

      fees = BigNumber.from(DepositAssetERC20_standardized.amount)
        .mul(await dotcManager.feeAmount())
        .div(await dotcManager.BPS());
      let outAmount = unstandardizeNumber(
        BigNumber.from(AwaitingOffer.depositAsset.amount).sub(fees),
        await erc20_1.decimals(),
      );

      deployerBalance_2 = await erc20_1.balanceOf(deployer.address);

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC721, AwaitingOffer.offer);

      take_offer = await dotc.connect(acc2).takeOffer(offerId, 0);

      await expect(take_offer)
        .to.emit(dotc, 'TakenOffer')
        .withArgs(offerId, acc2.address, AwaitingOffer.isFullyTaken, AwaitingOffer.depositAsset.amount, 0);
      await expect(take_offer).to.emit(escrow, 'OfferWithdrawn').withArgs(offerId, acc2.address, outAmount);

      offerId++;

      now = await time.latest();

      amountIn = 43;
      amountOut = BigNumber.from(202);

      decimals_1 = await erc20_1.decimals();
      decimals_2 = 1;
      amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_1));

      await erc20_1.transfer(acc1.address, amountIn_asset);
      await erc1155.safeTransferFrom(deployer.address, acc2.address, 3, 202, '0x00');

      await erc20_1.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

      DepositAssetERC20 = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: amountIn_asset,
        tokenId: 0,
      };

      let WithdrawalAssetERC1155 = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: 202,
        tokenId: 3,
      };

      DepositAssetERC20_standardized = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: standardizeNumber(amountIn_asset, decimals_1),
        tokenId: 0,
      };

      let WithdrawalAssetERC1155_standardized: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: standardizeNumber(amountOut, decimals_2),
        tokenId: 3,
      };

      AwaitingOffer = {
        maker: acc1.address,
        isFullyTaken: true,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC1155_standardized,
        availableAmount: DepositAssetERC20_standardized.amount,
        unitPrice: BigNumber.from(WithdrawalAssetERC1155_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_1))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
        offer: Offer,
      };

      fees = BigNumber.from(DepositAssetERC20_standardized.amount)
        .mul(await dotcManager.feeAmount())
        .div(await dotcManager.BPS());
      outAmount = unstandardizeNumber(
        BigNumber.from(AwaitingOffer.depositAsset.amount).sub(fees),
        await erc20_1.decimals(),
      );

      deployerBalance_2 = await erc20_1.balanceOf(deployer.address);

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC1155, AwaitingOffer.offer);

      take_offer = await dotc.connect(acc2).takeOffer(offerId, 0);

      await expect(take_offer)
        .to.emit(dotc, 'TakenOffer')
        .withArgs(offerId, acc2.address, AwaitingOffer.isFullyTaken, AwaitingOffer.depositAsset.amount, 0);
      await expect(take_offer).to.emit(escrow, 'OfferWithdrawn').withArgs(offerId, acc2.address, outAmount);

      offerId++;

      now = await time.latest();

      amountIn = BigNumber.from(301);
      amountOut = BigNumber.from(45);

      let decimals = 1;

      await erc1155.safeTransferFrom(deployer.address, acc1.address, 5, 301, '0x00');
      await erc1155.safeTransferFrom(deployer.address, acc2.address, 3, 45, '0x00');

      await erc1155.connect(acc1).setApprovalForAll(dotc.address, true);
      await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

      let DepositAssetERC1155 = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: 301,
        tokenId: 5,
      };

      WithdrawalAssetERC1155 = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: 45,
        tokenId: 3,
      };

      DepositAssetERC20_standardized = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: 301,
        tokenId: 5,
      };

      WithdrawalAssetERC1155_standardized = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: 45,
        tokenId: 3,
      };

      AwaitingOffer = {
        maker: acc1.address,
        isFullyTaken: true,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC1155_standardized,
        availableAmount: DepositAssetERC20_standardized.amount,
        unitPrice: BigNumber.from(WithdrawalAssetERC1155_standardized.amount)
          .mul(ethers.utils.parseEther('1'))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
        offer: Offer,
      };

      await dotc.connect(acc1).makeOffer(DepositAssetERC1155, WithdrawalAssetERC1155, AwaitingOffer.offer);

      take_offer = await dotc.connect(acc2).takeOffer(offerId, 0);

      await expect(take_offer)
        .to.emit(dotc, 'TakenOffer')
        .withArgs(offerId, acc2.address, AwaitingOffer.isFullyTaken, AwaitingOffer.depositAsset.amount, 0);
      await expect(take_offer)
        .to.emit(escrow, 'OfferWithdrawn')
        .withArgs(offerId, acc2.address, DepositAssetERC1155.amount);

      offerId++;

      now = await time.latest();

      let amount = BigNumber.from(1);
      decimals = 1;

      await erc721['safeTransferFrom(address,address,uint256)'](deployer.address, acc1.address, 3);
      await erc721['safeTransferFrom(address,address,uint256)'](deployer.address, acc2.address, 6);

      await erc721.connect(acc1).setApprovalForAll(dotc.address, true);
      await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

      let DepositAssetERC721 = {
        assetType: 2,
        assetAddress: erc721.address,
        amount: 1,
        tokenId: 3,
      };

      WithdrawalAssetERC721 = {
        assetType: 2,
        assetAddress: erc721.address,
        amount: 1,
        tokenId: 6,
      };

      let DepositAssetERC721_standardized = {
        assetType: 2,
        assetAddress: erc721.address,
        amount: 1,
        tokenId: 3,
      };

      WithdrawalAssetERC721_standardized = {
        assetType: 2,
        assetAddress: erc721.address,
        amount: BigNumber.from(1),
        tokenId: 6,
      };

      AwaitingOffer = {
        maker: acc1.address,
        isFullyTaken: true,
        depositAsset: DepositAssetERC721_standardized,
        withdrawalAsset: WithdrawalAssetERC721_standardized,
        availableAmount: DepositAssetERC721_standardized.amount,
        unitPrice: BigNumber.from(WithdrawalAssetERC721_standardized.amount)
          .mul(ethers.utils.parseEther('1'))
          .div(BigNumber.from(DepositAssetERC721_standardized.amount)),
        offer: Offer,
      };

      await dotc.connect(acc1).makeOffer(DepositAssetERC721, WithdrawalAssetERC721, AwaitingOffer.offer);

      take_offer = await dotc.connect(acc2).takeOffer(offerId, 0);

      await expect(take_offer)
        .to.emit(dotc, 'TakenOffer')
        .withArgs(offerId, acc2.address, AwaitingOffer.isFullyTaken, AwaitingOffer.depositAsset.amount, 0);
      await expect(take_offer).to.emit(escrow, 'OfferWithdrawn').withArgs(offerId, acc2.address, 1);
    });
  });

  describe('Cancel Offer', () => {
    it('Should cancel full offer (erc20 => erc20)', async () => {
      const { dotc, escrow, erc20_1, erc20_2, acc1, acc2 } = await loadFixture(fixture);

      let now = await time.latest();
      let offerId = 0;

      const amountIn = 43;
      const amountOut = 104;

      const decimals_1 = await erc20_1.decimals();
      const decimals_2 = await erc20_2.decimals();
      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_1));
      const amountOut_asset = BigNumber.from(amountOut).mul(BigNumber.from(10).pow(decimals_2));

      await erc20_1.transfer(acc1.address, amountIn_asset);
      await erc20_2.transfer(acc2.address, amountOut_asset);

      await erc20_1.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc20_2.connect(acc2).approve(dotc.address, amountOut_asset);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_2.address,
        amount: amountOut_asset,
        tokenId: 0,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: standardizeNumber(amountIn_asset, decimals_1),
        tokenId: 0,
      };

      const WithdrawalAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_2.address,
        amount: standardizeNumber(amountOut_asset, decimals_2),
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
        maker: acc1.address,
        isFullyTaken: true,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC20_standardized,
        availableAmount: 0,
        unitPrice: BigNumber.from(WithdrawalAssetERC20_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_1))
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

      const cancel_offer = await dotc.connect(acc1).cancelOffer(offerId);

      await expect(cancel_offer)
        .to.emit(dotc, 'CanceledOffer')
        .withArgs(offerId, acc1.address, DepositAssetERC20.amount);
      await expect(cancel_offer)
        .to.emit(escrow, 'OfferCancelled')
        .withArgs(offerId, acc1.address, DepositAssetERC20.amount);

      expect(await erc20_1.balanceOf(escrow.address)).to.eq(0);
      expect(await erc20_1.balanceOf(acc1.address)).to.eq(DepositAssetERC20.amount);

      expect((await dotc.allOffers(0)).offer.isFullType).to.eq(false);
      expect((await dotc.allOffers(0)).maker).to.eq(addressZero);
      expect((await dotc.allOffers(0)).isFullyTaken).to.eq(false);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(0);
      expect((await dotc.allOffers(0)).unitPrice).to.eq(0);
      expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq([]);

      expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(0);
      expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(0);

      expect(await dotc.offersFromAddress(acc1.address, 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(addressZero);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(0);

      await expect(dotc.connect(acc1).cancelOffer(2002)).to.be.revertedWithCustomError(dotc, 'OnlyMakerAllowedError');
    });

    it('Should cancel partial offer (erc20 => erc20)', async () => {
      const { dotc, escrow, dotcManager, erc20_1, erc20_2, acc1, acc2, deployer } = await loadFixture(fixture);

      let now = await time.latest();
      let offerId = 0;

      const amountIn = 43;
      const amountOut = 104;

      const decimals_1 = await erc20_1.decimals();
      const decimals_2 = await erc20_2.decimals();
      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_1));
      const amountOut_asset = BigNumber.from(amountOut).mul(BigNumber.from(10).pow(decimals_2));
      const amountOut_to_take = BigNumber.from(amountOut - 50).mul(BigNumber.from(10).pow(decimals_2));
      const standardized_amountOut_to_take = standardizeNumber(amountOut_to_take, decimals_2);

      await erc20_1.transfer(acc1.address, amountIn_asset);
      await erc20_2.transfer(acc2.address, amountOut_asset);

      await erc20_1.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc20_2.connect(acc2).approve(dotc.address, amountOut_asset);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_2.address,
        amount: amountOut_asset,
        tokenId: 0,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: standardizeNumber(amountIn_asset, decimals_1),
        tokenId: 0,
      };

      const WithdrawalAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_2.address,
        amount: standardizeNumber(amountOut_asset, decimals_2),
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
        maker: acc1.address,
        isFullyTaken: false,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC20_standardized,
        availableAmount: DepositAssetERC20_standardized.amount,
        unitPrice: BigNumber.from(WithdrawalAssetERC20_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_1))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
        offer: Offer,
      };

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

      const cancel_offer = await dotc.connect(acc1).cancelOffer(offerId);

      await expect(cancel_offer)
        .to.emit(dotc, 'CanceledOffer')
        .withArgs(offerId, acc1.address, DepositAssetERC20.amount);
      await expect(cancel_offer)
        .to.emit(escrow, 'OfferCancelled')
        .withArgs(offerId, acc1.address, DepositAssetERC20.amount);

      expect(await erc20_1.balanceOf(escrow.address)).to.eq(0);
      expect(await erc20_1.balanceOf(acc1.address)).to.eq(DepositAssetERC20.amount);

      expect((await dotc.allOffers(0)).offer.isFullType).to.eq(false);
      expect((await dotc.allOffers(0)).maker).to.eq(addressZero);
      expect((await dotc.allOffers(0)).isFullyTaken).to.eq(false);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(0);
      expect((await dotc.allOffers(0)).unitPrice).to.eq(0);
      expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq([]);

      expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(0);
      expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(0);

      expect(await dotc.offersFromAddress(acc1.address, 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(addressZero);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(0);

      offerId++;
    });

    it('Should cancel partial with taken amount offer (erc20 => erc20)', async () => {
      const { dotc, escrow, dotcManager, erc20_1, erc20_2, acc1, acc2 } = await loadFixture(fixture);

      let now = await time.latest();
      let offerId = 0;

      const amountIn = 43;
      const amountOut = 104;

      const decimals_1 = await erc20_1.decimals();
      const decimals_2 = await erc20_2.decimals();
      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_1));
      const amountOut_asset = BigNumber.from(amountOut).mul(BigNumber.from(10).pow(decimals_2));
      const amountOut_to_take = BigNumber.from(amountOut - 50).mul(BigNumber.from(10).pow(decimals_2));
      const standardized_amountOut_to_take = standardizeNumber(amountOut_to_take, decimals_2);

      await erc20_1.transfer(acc1.address, amountIn_asset);
      await erc20_2.transfer(acc2.address, amountOut_asset);

      await erc20_1.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc20_2.connect(acc2).approve(dotc.address, amountOut_asset);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_2.address,
        amount: amountOut_asset,
        tokenId: 0,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: standardizeNumber(amountIn_asset, decimals_1),
        tokenId: 0,
      };

      const WithdrawalAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_2.address,
        amount: standardizeNumber(amountOut_asset, decimals_2),
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
        maker: acc1.address,
        isFullyTaken: false,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC20_standardized,
        availableAmount: DepositAssetERC20_standardized.amount,
        unitPrice: BigNumber.from(WithdrawalAssetERC20_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_1))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
        offer: Offer,
      };

      const amountToWitdraw = standardized_amountOut_to_take
        .mul(BigNumber.from(10).pow(await dotcManager.DECIMALS()))
        .div(BigNumber.from(AwaitingOffer.unitPrice));
      let amountToCancel = BigNumber.from(DepositAssetERC20_standardized.amount).sub(amountToWitdraw);
      const unstandardAmount = unstandardizeNumber(amountToCancel, await erc20_1.decimals());

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

      const balance = await erc20_1.balanceOf(escrow.address);

      await dotc.connect(acc2).takeOffer(offerId, amountOut_to_take);

      amountToCancel = (await escrow.assetDeposits(offerId)).amount;

      const cancel_offer = await dotc.connect(acc1).cancelOffer(offerId);

      await expect(cancel_offer).to.emit(dotc, 'CanceledOffer').withArgs(offerId, acc1.address, amountToCancel);
      await expect(cancel_offer).to.emit(escrow, 'OfferCancelled').withArgs(offerId, acc1.address, amountToCancel);

      expect(await erc20_1.balanceOf(escrow.address)).to.eq(0);
      expect(await erc20_1.balanceOf(acc1.address)).to.eq(amountToCancel);

      expect((await dotc.allOffers(0)).offer.isFullType).to.eq(false);
      expect((await dotc.allOffers(0)).maker).to.eq(addressZero);
      expect((await dotc.allOffers(0)).isFullyTaken).to.eq(false);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(0);
      expect((await dotc.allOffers(0)).unitPrice).to.eq(0);
      expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq([]);

      expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(0);
      expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(0);

      expect(await dotc.offersFromAddress(acc1.address, 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(addressZero);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(0);

      offerId++;
    });

    it('Should cancel full offer (erc20 => erc721)', async () => {
      const { dotc, escrow, erc20_1, erc721, acc1, acc2, deployer } = await loadFixture(fixture);

      let now = await time.latest();
      let offerId = 0;

      const amountIn = 43;
      const amountOut = BigNumber.from(1);

      const decimals_1 = await erc20_1.decimals();
      const decimals_2 = 1;
      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_1));

      await erc20_1.transfer(acc1.address, amountIn_asset);
      await erc721['safeTransferFrom(address,address,uint256)'](deployer.address, acc2.address, 4);

      await erc20_1.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
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
        assetAddress: erc20_1.address,
        amount: standardizeNumber(amountIn_asset, decimals_1),
        tokenId: 0,
      };

      const WithdrawalAssetERC721_standardized: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        amount: standardizeNumber(amountOut, decimals_2),
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
        maker: acc1.address,
        isFullyTaken: true,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC721_standardized,
        availableAmount: DepositAssetERC20_standardized.amount,
        unitPrice: BigNumber.from(WithdrawalAssetERC721_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_1))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
        offer: Offer,
      };

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC721, AwaitingOffer.offer);

      const cancel_offer = await dotc.connect(acc1).cancelOffer(offerId);

      await expect(cancel_offer)
        .to.emit(dotc, 'CanceledOffer')
        .withArgs(offerId, acc1.address, DepositAssetERC20.amount);
      await expect(cancel_offer)
        .to.emit(escrow, 'OfferCancelled')
        .withArgs(offerId, acc1.address, DepositAssetERC20.amount);

      expect(await erc20_1.balanceOf(escrow.address)).to.eq(0);
      expect(await erc20_1.balanceOf(acc1.address)).to.eq(DepositAssetERC20.amount);

      expect((await dotc.allOffers(0)).offer.isFullType).to.eq(false);
      expect((await dotc.allOffers(0)).maker).to.eq(addressZero);
      expect((await dotc.allOffers(0)).isFullyTaken).to.eq(false);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(0);
      expect((await dotc.allOffers(0)).unitPrice).to.eq(0);
      expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq([]);

      expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(0);
      expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(0);

      expect(await dotc.offersFromAddress(acc1.address, 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(addressZero);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(0);

      offerId++;
    });

    it('Should cancel full offer (erc721 => erc20)', async () => {
      const { dotc, escrow, erc20_1, erc721, acc1, acc2, deployer } = await loadFixture(fixture);

      let now = await time.latest();
      let offerId = 0;

      const amountIn = 43;
      const amountOut = BigNumber.from(1);

      const decimals_1 = await erc20_1.decimals();
      const decimals_2 = 1;
      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_1));

      await erc20_1.transfer(acc1.address, amountIn_asset);
      await erc721['safeTransferFrom(address,address,uint256)'](deployer.address, acc2.address, 4);

      await erc20_1.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
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
        assetAddress: erc20_1.address,
        amount: standardizeNumber(amountIn_asset, decimals_1),
        tokenId: 0,
      };

      const WithdrawalAssetERC721_standardized: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        amount: standardizeNumber(amountOut, decimals_2),
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
        maker: acc2.address,
        isFullyTaken: true,
        depositAsset: WithdrawalAssetERC721_standardized,
        withdrawalAsset: DepositAssetERC20_standardized,
        availableAmount: WithdrawalAssetERC721_standardized.amount,
        unitPrice: BigNumber.from(DepositAssetERC20_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_1))
          .div(BigNumber.from(WithdrawalAssetERC721_standardized.amount)),
        offer: Offer,
      };

      await dotc.connect(acc2).makeOffer(WithdrawalAssetERC721, DepositAssetERC20, AwaitingOffer.offer);

      const cancel_offer = await dotc.connect(acc2).cancelOffer(offerId);

      await expect(cancel_offer)
        .to.emit(dotc, 'CanceledOffer')
        .withArgs(offerId, acc2.address, WithdrawalAssetERC721.amount);
      await expect(cancel_offer)
        .to.emit(escrow, 'OfferCancelled')
        .withArgs(offerId, acc2.address, WithdrawalAssetERC721.amount);

      expect(await erc721.ownerOf(WithdrawalAssetERC721.tokenId)).to.eq(acc2.address);

      expect((await dotc.allOffers(0)).offer.isFullType).to.eq(false);
      expect((await dotc.allOffers(0)).maker).to.eq(addressZero);
      expect((await dotc.allOffers(0)).isFullyTaken).to.eq(false);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(0);
      expect((await dotc.allOffers(0)).unitPrice).to.eq(0);
      expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq([]);

      expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(0);
      expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(0);

      expect(await dotc.offersFromAddress(acc2.address, 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(addressZero);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(0);

      offerId++;
    });

    it('Should cancel full offer (erc20 => erc1155)', async () => {
      const { dotc, escrow, erc20_1, erc1155, acc1, acc2, deployer } = await loadFixture(fixture);

      let now = await time.latest();
      let offerId = 0;

      const amountIn = 43;
      const amountOut = BigNumber.from(202);

      const decimals_1 = await erc20_1.decimals();
      const decimals_2 = 1;
      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_1));

      await erc20_1.transfer(acc1.address, amountIn_asset);
      await erc1155.safeTransferFrom(deployer.address, acc2.address, 3, 202, '0x00');

      await erc20_1.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: 202,
        tokenId: 3,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: standardizeNumber(amountIn_asset, decimals_1),
        tokenId: 0,
      };

      const WithdrawalAssetERC1155_standardized: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: standardizeNumber(amountOut, decimals_2),
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
        maker: acc1.address,
        isFullyTaken: true,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC1155_standardized,
        availableAmount: DepositAssetERC20_standardized.amount,
        unitPrice: BigNumber.from(WithdrawalAssetERC1155_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_1))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
        offer: Offer,
      };

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC1155, AwaitingOffer.offer);

      const cancel_offer = await dotc.connect(acc1).cancelOffer(offerId);

      await expect(cancel_offer)
        .to.emit(dotc, 'CanceledOffer')
        .withArgs(offerId, acc1.address, DepositAssetERC20.amount);
      await expect(cancel_offer)
        .to.emit(escrow, 'OfferCancelled')
        .withArgs(offerId, acc1.address, DepositAssetERC20.amount);

      expect(await erc20_1.balanceOf(escrow.address)).to.eq(0);
      expect(await erc20_1.balanceOf(acc1.address)).to.eq(DepositAssetERC20.amount);

      expect((await dotc.allOffers(0)).offer.isFullType).to.eq(false);
      expect((await dotc.allOffers(0)).maker).to.eq(addressZero);
      expect((await dotc.allOffers(0)).isFullyTaken).to.eq(false);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(0);
      expect((await dotc.allOffers(0)).unitPrice).to.eq(0);
      expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq([]);

      expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(0);
      expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(0);

      expect(await dotc.offersFromAddress(acc1.address, 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(addressZero);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(0);

      offerId++;
    });

    it('Should cancel full offer (erc1155 => erc20)', async () => {
      const { dotc, escrow, erc20_1, erc1155, acc1, acc2, deployer } = await loadFixture(fixture);

      let now = await time.latest();
      let offerId = 0;

      const amountIn = 43;
      const amountOut = BigNumber.from(202);

      const decimals_1 = await erc20_1.decimals();
      const decimals_2 = 1;
      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_1));

      await erc20_1.transfer(acc1.address, amountIn_asset);
      await erc1155.safeTransferFrom(deployer.address, acc2.address, 3, 202, '0x00');

      await erc20_1.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: 202,
        tokenId: 3,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: standardizeNumber(amountIn_asset, decimals_1),
        tokenId: 0,
      };

      const WithdrawalAssetERC1155_standardized: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: standardizeNumber(amountOut, decimals_2),
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
        maker: acc2.address,
        isFullyTaken: true,
        depositAsset: WithdrawalAssetERC1155_standardized,
        withdrawalAsset: DepositAssetERC20_standardized,
        availableAmount: WithdrawalAssetERC1155_standardized.amount,
        unitPrice: BigNumber.from(DepositAssetERC20_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_1))
          .div(BigNumber.from(WithdrawalAssetERC1155_standardized.amount)),
        offer: Offer,
      };

      await dotc.connect(acc2).makeOffer(WithdrawalAssetERC1155, DepositAssetERC20, AwaitingOffer.offer);

      const cancel_offer = await dotc.connect(acc2).cancelOffer(offerId);

      await expect(cancel_offer)
        .to.emit(dotc, 'CanceledOffer')
        .withArgs(offerId, acc2.address, WithdrawalAssetERC1155.amount);
      await expect(cancel_offer)
        .to.emit(escrow, 'OfferCancelled')
        .withArgs(offerId, acc2.address, WithdrawalAssetERC1155.amount);

      expect(await erc1155.balanceOf(escrow.address, WithdrawalAssetERC1155.tokenId)).to.eq(0);
      expect(await erc1155.balanceOf(acc2.address, WithdrawalAssetERC1155.tokenId)).to.eq(
        WithdrawalAssetERC1155.amount,
      );

      expect((await dotc.allOffers(0)).offer.isFullType).to.eq(false);
      expect((await dotc.allOffers(0)).maker).to.eq(addressZero);
      expect((await dotc.allOffers(0)).isFullyTaken).to.eq(false);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(0);
      expect((await dotc.allOffers(0)).unitPrice).to.eq(0);
      expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq([]);

      expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(0);
      expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(0);

      expect(await dotc.offersFromAddress(acc2.address, 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(addressZero);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(0);

      offerId++;
    });

    it('Should cancel full offer (erc721 => erc721)', async () => {
      const { dotc, escrow, erc721, acc1, acc2, deployer } = await loadFixture(fixture);

      let now = await time.latest();
      let offerId = 0;

      const amount = BigNumber.from(1);
      const decimals = 1;

      await erc721['safeTransferFrom(address,address,uint256)'](deployer.address, acc1.address, 2);
      await erc721['safeTransferFrom(address,address,uint256)'](deployer.address, acc2.address, 4);

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
        maker: acc1.address,
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
        .withArgs(offerId, acc2.address, WithdrawalAssetERC721.amount);
      await expect(cancel_offer)
        .to.emit(escrow, 'OfferCancelled')
        .withArgs(offerId, acc2.address, WithdrawalAssetERC721.amount);

      expect(await erc721.ownerOf(WithdrawalAssetERC721.tokenId)).to.eq(acc2.address);

      expect((await dotc.allOffers(0)).offer.isFullType).to.eq(false);
      expect((await dotc.allOffers(0)).maker).to.eq(addressZero);
      expect((await dotc.allOffers(0)).isFullyTaken).to.eq(false);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(0);
      expect((await dotc.allOffers(0)).unitPrice).to.eq(0);
      expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq([]);

      expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(0);
      expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(0);

      expect(await dotc.offersFromAddress(acc2.address, 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(addressZero);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(0);

      offerId++;
    });

    it('Should cancel full offer (erc1155 => erc1155)', async () => {
      const { dotc, escrow, erc1155, acc1, acc2, deployer } = await loadFixture(fixture);

      let now = await time.latest();
      let offerId = 0;

      const amountIn = BigNumber.from(42);
      const amountOut = BigNumber.from(202);

      const decimals = 1;

      await erc1155.safeTransferFrom(deployer.address, acc1.address, 5, 202, '0x00');
      await erc1155.safeTransferFrom(deployer.address, acc2.address, 3, 202, '0x00');

      await erc1155.connect(acc1).setApprovalForAll(dotc.address, true);
      await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: 42,
        tokenId: 5,
      };

      const WithdrawalAssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
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
        maker: acc1.address,
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
        .withArgs(offerId, acc2.address, WithdrawalAssetERC1155.amount);
      await expect(cancel_offer)
        .to.emit(escrow, 'OfferCancelled')
        .withArgs(offerId, acc2.address, WithdrawalAssetERC1155.amount);

      expect(await erc1155.balanceOf(escrow.address, WithdrawalAssetERC1155.tokenId)).to.eq(0);
      expect(await erc1155.balanceOf(acc2.address, WithdrawalAssetERC1155.tokenId)).to.eq(
        WithdrawalAssetERC1155.amount,
      );

      expect((await dotc.allOffers(0)).offer.isFullType).to.eq(false);
      expect((await dotc.allOffers(0)).maker).to.eq(addressZero);
      expect((await dotc.allOffers(0)).isFullyTaken).to.eq(false);
      expect((await dotc.allOffers(0)).availableAmount).to.eq(0);
      expect((await dotc.allOffers(0)).unitPrice).to.eq(0);
      expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq([]);

      expect((await dotc.allOffers(0)).offer.expiryTimestamp).to.eq(0);
      expect((await dotc.allOffers(0)).offer.timelockPeriod).to.eq(0);

      expect(await dotc.offersFromAddress(acc2.address, 0)).to.eq(offerId);

      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(addressZero);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(0);

      offerId++;
    });
  });

  describe('Update Offer', () => {
    it('Should update full offer (erc20 => erc20)', async () => {
      const { dotc, escrow, erc20_1, erc20_2, acc1, acc2, acc3, deployer } = await loadFixture(fixture);

      let now = await time.latest();
      let offerId = 0;

      const amountIn = 43;
      const amountOut = 104;

      const decimals_1 = await erc20_1.decimals();
      const decimals_2 = await erc20_2.decimals();
      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_1));
      const amountOut_asset = BigNumber.from(amountOut).mul(BigNumber.from(10).pow(decimals_2));

      await erc20_1.transfer(acc1.address, amountIn_asset);
      await erc20_2.transfer(acc2.address, amountOut_asset);

      await erc20_1.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc20_2.connect(acc2).approve(dotc.address, amountOut_asset);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_2.address,
        amount: amountOut_asset,
        tokenId: 0,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: standardizeNumber(amountIn_asset, decimals_1),
        tokenId: 0,
      };

      const WithdrawalAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_2.address,
        amount: standardizeNumber(amountOut_asset, decimals_2),
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
        maker: acc1.address,
        isFullyTaken: true,
        depositAsset: DepositAssetERC20_standardized,
        withdrawalAsset: WithdrawalAssetERC20_standardized,
        availableAmount: 0,
        unitPrice: BigNumber.from(WithdrawalAssetERC20_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_1))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
        offer: Offer,
      };

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, AwaitingOffer.offer);

      const newAmountOut = amountOut_asset.add(amountOut_asset);
      const standardizedOut = standardizeNumber(newAmountOut, await erc20_2.decimals());

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
          .mul(BigNumber.from(10).pow(decimals_1))
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

      Offer.specialAddresses = [acc2.address];
      Offer.expiryTimestamp = now + 2000;
      Offer.timelockPeriod = now + 200;
      const update_offer_5 = await dotc.connect(acc1).updateOffer(offerId, newAmountOut, Offer);
      await expect(update_offer_5).to.emit(dotc, 'OfferSpecialAddressesUpdated').withArgs(offerId, [acc2.address]);
      expect((await dotc.allOffers(0)).offer.specialAddresses).to.deep.eq([acc2.address]);

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
      const { dotc, erc1155, erc20_1, acc1, acc2, deployer } = await loadFixture(fixture);

      let now = await time.latest();
      let offerId = 0;

      const amountIn = 43;
      const amountOut = BigNumber.from(202);

      const decimals_1 = await erc20_1.decimals();
      const decimals_2 = 1;
      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_1));

      await erc20_1.transfer(acc1.address, amountIn_asset);
      await erc1155.safeTransferFrom(deployer.address, acc2.address, 3, 202, '0x00');

      await erc20_1.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc1155.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: amountIn_asset,
        tokenId: 0,
      };

      const WithdrawalAssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: 202,
        tokenId: 3,
      };

      const DepositAssetERC20_standardized: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
        amount: standardizeNumber(amountIn_asset, decimals_1),
        tokenId: 0,
      };

      const WithdrawalAssetERC1155_standardized: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: standardizeNumber(amountOut, decimals_2),
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
        maker: acc2.address,
        isFullyTaken: true,
        depositAsset: WithdrawalAssetERC1155_standardized,
        withdrawalAsset: DepositAssetERC20_standardized,
        availableAmount: WithdrawalAssetERC1155_standardized.amount,
        unitPrice: BigNumber.from(DepositAssetERC20_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_1))
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
          .mul(BigNumber.from(10).pow(decimals_1))
          .div(BigNumber.from(DepositAssetERC20_standardized.amount)),
      );

      offerId++;
    });

    it('Should update full offer (erc20 => erc721)', async () => {
      const { dotc, erc721, erc20_1, acc1, acc2, deployer } = await loadFixture(fixture);

      let now = await time.latest();
      let offerId = 0;

      const amountIn = 43;
      const amountOut = BigNumber.from(1);

      const decimals_1 = await erc20_1.decimals();
      const decimals_2 = 1;
      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_1));

      await erc20_1.transfer(acc1.address, amountIn_asset);
      await erc721['safeTransferFrom(address,address,uint256)'](deployer.address, acc2.address, 4);

      await erc20_1.connect(acc1).approve(dotc.address, amountIn_asset);
      await erc721.connect(acc2).setApprovalForAll(dotc.address, true);

      const DepositAssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20_1.address,
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
        assetAddress: erc20_1.address,
        amount: standardizeNumber(amountIn_asset, decimals_1),
        tokenId: 0,
      };

      const WithdrawalAssetERC721_standardized: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        amount: standardizeNumber(amountOut, decimals_2),
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
        maker: acc2.address,
        isFullyTaken: true,
        depositAsset: WithdrawalAssetERC721_standardized,
        withdrawalAsset: DepositAssetERC20_standardized,
        availableAmount: WithdrawalAssetERC721_standardized.amount,
        unitPrice: BigNumber.from(DepositAssetERC20_standardized.amount)
          .mul(BigNumber.from(10).pow(decimals_1))
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
