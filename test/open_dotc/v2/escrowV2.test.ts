import { ethers, upgrades } from 'hardhat';
import { BigNumber, ContractFactory, Signer } from 'ethers';
import { expect } from 'chai';
import {
  DotcEscrowV2 as DotcEscrow,
  DotcManagerV2,
  ERC20MockV2,
  ERC721MockV2,
  ERC1155MockV2,
} from '../../../typechain';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { AssetStruct, EscrowOfferStatusType, AssetPriceStruct } from '../../helpers/StructuresV2';

describe('OpenDotcEscrowV2', () => {
  async function fixture() {
    const [deployer, otherAcc]: Signer[] = await ethers.getSigners();

    const DotcManager: ContractFactory = await ethers.getContractFactory('DotcManagerV2');
    const dotcManager = (await upgrades.deployProxy(DotcManager, [await deployer.getAddress()])) as DotcManagerV2;
    await dotcManager.deployed();

    const DotcEscrow: ContractFactory = await ethers.getContractFactory('DotcEscrowV2');
    const escrow = await upgrades.deployProxy(DotcEscrow, [dotcManager.address], { unsafeAllowLinkedLibraries: true }) as DotcEscrow;
    await escrow.deployed();

    // Deploy mock tokens
    const ERC20: ContractFactory = await ethers.getContractFactory('ERC20MockV2');
    const erc20 = await ERC20.deploy(18) as ERC20MockV2;
    await erc20.deployed();

    const ERC721: ContractFactory = await ethers.getContractFactory('ERC721MockV2');
    const erc721 = await ERC721.deploy() as ERC721MockV2;
    await erc721.deployed();

    const ERC1155: ContractFactory = await ethers.getContractFactory('ERC1155MockV2');
    const erc1155 = await ERC1155.deploy() as ERC1155MockV2;
    await erc1155.deployed();

    await dotcManager.changeEscrow(escrow.address);
    await dotcManager.changeDotc(await otherAcc.getAddress());
    await dotcManager.changeDotcInEscrow();

    return {
      deployer,
      otherAcc,
      escrow,
      erc20,
      erc721,
      erc1155,
    };
  }

  describe('Deployment', () => {
    it('Should be deployed correctly', async () => {
      const { escrow, otherAcc } = await loadFixture(fixture);

      expect(await escrow.dotc()).to.be.eq(await otherAcc.getAddress());

      expect(escrow.address).to.be.properAddress;
    });

    it('Should be initialized', async () => {
      const { escrow } = await loadFixture(fixture);

      await expect(escrow.initialize(escrow.address)).to.be.revertedWithCustomError(escrow, 'InvalidInitialization');
    });
  });

  describe('Write functions', () => {
    it('Should set deposit', async () => {
      const { escrow, erc20, otherAcc } = await loadFixture(fixture);

      const offerId = 55;

      const Price: AssetPriceStruct = {
        priceFeedAddress: await otherAcc.getAddress(),
        offerMaximumPrice: 0,
        offerMinimumPrice: 0,
      }

      const AssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20.address,
        assetPrice: Price,
        amount: BigNumber.from('500000000000000000000'),
        tokenId: 0,
      };

      const tx = await escrow.connect(otherAcc).setDeposit(offerId, await otherAcc.getAddress(), AssetERC20);

      await expect(tx).to.emit(escrow, 'OfferDeposited').withArgs(offerId, await otherAcc.getAddress(), AssetERC20.amount);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(AssetERC20.amount);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.assetAddress).to.be.eq(AssetERC20.assetAddress);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.assetType).to.be.eq(AssetERC20.assetType);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.tokenId).to.be.eq(AssetERC20.tokenId);

      expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(EscrowOfferStatusType.OfferDeposited);
    });

    it('Should withdraw deposit', async () => {
      const { escrow, erc20, erc721, erc1155, otherAcc, deployer } = await loadFixture(fixture);

      let offerId = 55;

      const Price: AssetPriceStruct = {
        priceFeedAddress: await otherAcc.getAddress(),
        offerMaximumPrice: 0,
        offerMinimumPrice: 0,
      }

      let AssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20.address,
        assetPrice: Price,
        amount: BigNumber.from('500000000000000000000'),
        tokenId: 0,
      };

      const AssetERC721: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        assetPrice: Price,
        amount: 1,
        tokenId: 4,
      };

      const AssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        assetPrice: Price,
        amount: 202,
        tokenId: 3,
      };

      await erc20.transfer(escrow.address, BigNumber.from(AssetERC20.amount).add(20));
      expect(await erc20.balanceOf(escrow.address)).to.eq(BigNumber.from(AssetERC20.amount).add(20));
      await erc721['safeTransferFrom(address,address,uint256)'](await deployer.getAddress(), escrow.address, AssetERC721.tokenId);
      expect(await erc721.ownerOf(AssetERC721.tokenId)).to.eq(escrow.address);
      await erc1155.safeTransferFrom(
        await deployer.getAddress(),
        escrow.address,
        AssetERC1155.tokenId,
        AssetERC1155.amount,
        '0x00',
      );
      expect(await erc1155.balanceOf(escrow.address, AssetERC1155.tokenId)).to.eq(AssetERC1155.amount);

      // ERC20
      await escrow.connect(otherAcc).setDeposit(offerId, await otherAcc.getAddress(), AssetERC20);

      const tx_1 = await escrow.connect(otherAcc).withdrawDeposit(offerId, AssetERC20.amount, await otherAcc.getAddress());

      await expect(tx_1)
        .to.emit(escrow, 'OfferWithdrawn')
        .withArgs(offerId, await otherAcc.getAddress(), AssetERC20.amount);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);
      expect(await erc20.balanceOf(await otherAcc.getAddress())).to.eq(BigNumber.from(AssetERC20.amount));
      expect(await erc20.balanceOf(escrow.address)).to.eq(20);

      expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(EscrowOfferStatusType.OfferFullyWithdrawn);

      ++offerId;

      AssetERC20 = {
        assetType: 1,
        assetAddress: erc20.address,
        assetPrice: Price,
        amount: 0,
        tokenId: 0,
      };

      await escrow.connect(otherAcc).setDeposit(offerId, await otherAcc.getAddress(), AssetERC20);

      await expect(
        escrow.connect(otherAcc).withdrawDeposit(offerId, 1, await otherAcc.getAddress()),
      ).to.be.revertedWithCustomError(escrow, 'AssetAmountEqZero');

      ++offerId;

      AssetERC20 = {
        assetType: 1,
        assetAddress: erc20.address,
        assetPrice: Price,
        amount: 1,
        tokenId: 0,
      };
    });

    it('Should withdraw full deposit', async () => {
      const { escrow, erc20, erc721, erc1155, otherAcc, deployer } = await loadFixture(fixture);

      let offerId = 55;

      const Price: AssetPriceStruct = {
        priceFeedAddress: await otherAcc.getAddress(),
        offerMaximumPrice: 0,
        offerMinimumPrice: 0
      }

      const AssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20.address,
        assetPrice: Price,
        amount: BigNumber.from('500000000000000000000'),
        tokenId: 0,
      };

      const AssetERC721: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        assetPrice: Price,
        amount: 1,
        tokenId: 4,
      };

      const AssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        assetPrice: Price,
        amount: 202,
        tokenId: 3,
      };

      await erc20.transfer(escrow.address, BigNumber.from(AssetERC20.amount).add(20));
      expect(await erc20.balanceOf(escrow.address)).to.eq(BigNumber.from(AssetERC20.amount).add(20));
      await erc721['safeTransferFrom(address,address,uint256)'](await deployer.getAddress(), escrow.address, AssetERC721.tokenId);
      expect(await erc721.ownerOf(AssetERC721.tokenId)).to.eq(escrow.address);
      await erc1155.safeTransferFrom(
        await deployer.getAddress(),
        escrow.address,
        AssetERC1155.tokenId,
        AssetERC1155.amount,
        '0x00',
      );
      expect(await erc1155.balanceOf(escrow.address, AssetERC1155.tokenId)).to.eq(AssetERC1155.amount);

      // ERC20
      await escrow.connect(otherAcc).setDeposit(offerId, await otherAcc.getAddress(), AssetERC20);

      const tx_1 = await escrow.connect(otherAcc).withdrawDeposit(offerId, AssetERC20.amount, await otherAcc.getAddress());

      await expect(tx_1)
        .to.emit(escrow, 'OfferWithdrawn')
        .withArgs(offerId, await otherAcc.getAddress(), BigNumber.from(AssetERC20.amount));
      expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);
      expect(await erc20.balanceOf(await otherAcc.getAddress())).to.eq(BigNumber.from(AssetERC20.amount));
      expect(await erc20.balanceOf(escrow.address)).to.eq(20);

      expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(EscrowOfferStatusType.OfferFullyWithdrawn);

      ++offerId;

      // ERC721
      await escrow.connect(otherAcc).setDeposit(offerId, await otherAcc.getAddress(), AssetERC721);

      const tx_2 = await escrow.connect(otherAcc).withdrawDeposit(offerId, AssetERC721.amount, await otherAcc.getAddress());

      await expect(tx_2).to.emit(escrow, 'OfferWithdrawn').withArgs(offerId, await otherAcc.getAddress(), AssetERC721.amount);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);
      expect(await erc721.ownerOf(AssetERC721.tokenId)).to.eq(await otherAcc.getAddress());

      expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(EscrowOfferStatusType.OfferFullyWithdrawn);

      ++offerId;

      // ERC1155
      await escrow.connect(otherAcc).setDeposit(offerId, await otherAcc.getAddress(), AssetERC1155);

      const tx_3 = await escrow.connect(otherAcc).withdrawDeposit(offerId, AssetERC1155.amount, await otherAcc.getAddress());

      await expect(tx_3).to.emit(escrow, 'OfferWithdrawn').withArgs(offerId, await otherAcc.getAddress(), AssetERC1155.amount);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);
      expect(await erc1155.balanceOf(await otherAcc.getAddress(), AssetERC1155.tokenId)).to.eq(AssetERC1155.amount);
      expect(await erc1155.balanceOf(escrow.address, AssetERC1155.tokenId)).to.eq(0);

      expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(EscrowOfferStatusType.OfferFullyWithdrawn);
    });

    it('Should cancel deposit', async () => {
      const { escrow, erc20, erc721, erc1155, otherAcc, deployer } = await loadFixture(fixture);

      let offerId = 55;

      const Price: AssetPriceStruct = {
        priceFeedAddress: await otherAcc.getAddress(),
        offerMaximumPrice: 0,
        offerMinimumPrice: 0
      }

      let AssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20.address,
        assetPrice: Price,
        amount: BigNumber.from('500000000000000000000'),
        tokenId: 0,
      };

      const AssetERC721: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        assetPrice: Price,
        amount: 1,
        tokenId: 4,
      };

      const AssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        assetPrice: Price,
        amount: 202,
        tokenId: 3,
      };

      await erc20.transfer(escrow.address, BigNumber.from(AssetERC20.amount));
      await erc721['safeTransferFrom(address,address,uint256)'](await deployer.getAddress(), escrow.address, AssetERC721.tokenId);
      await erc1155.safeTransferFrom(
        await deployer.getAddress(),
        escrow.address,
        AssetERC1155.tokenId,
        AssetERC1155.amount,
        '0x00',
      );

      // ERC20
      await escrow.connect(otherAcc).setDeposit(offerId, await otherAcc.getAddress(), AssetERC20);

      const tx_1 = await escrow.connect(otherAcc).cancelDeposit(offerId, await otherAcc.getAddress());

      await expect(tx_1).to.emit(escrow, 'OfferCancelled').withArgs(offerId, await otherAcc.getAddress(), AssetERC20.amount);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);
      expect(await erc20.balanceOf(await otherAcc.getAddress())).to.eq(BigNumber.from(AssetERC20.amount));
      expect(await erc20.balanceOf(escrow.address)).to.eq(0);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.assetAddress).to.be.eq(AssetERC20.assetAddress);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.assetType).to.be.eq(AssetERC20.assetType);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.tokenId).to.be.eq(AssetERC20.tokenId);

      expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(EscrowOfferStatusType.OfferCancelled);

      ++offerId;

      AssetERC20 = {
        assetType: 1,
        assetAddress: erc20.address,
        assetPrice: Price,
        amount: 0,
        tokenId: 0,
      };

      await escrow.connect(otherAcc).setDeposit(offerId, await otherAcc.getAddress(), AssetERC20);

      await expect(escrow.connect(otherAcc).cancelDeposit(offerId, await otherAcc.getAddress())).to.be.revertedWithCustomError(
        escrow,
        'AmountToCancelEqZero',
      );

      ++offerId;

      // ERC721
      await escrow.connect(otherAcc).setDeposit(offerId, await otherAcc.getAddress(), AssetERC721);

      const tx_2 = await escrow.connect(otherAcc).cancelDeposit(offerId, await otherAcc.getAddress());

      await expect(tx_2).to.emit(escrow, 'OfferCancelled').withArgs(offerId, await otherAcc.getAddress(), AssetERC721.amount);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);
      expect(await erc721.ownerOf(AssetERC721.tokenId)).to.eq(await otherAcc.getAddress());
      expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.assetAddress).to.be.eq(AssetERC721.assetAddress);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.assetType).to.be.eq(AssetERC721.assetType);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.tokenId).to.be.eq(AssetERC721.tokenId);

      expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(EscrowOfferStatusType.OfferCancelled);

      ++offerId;

      // ERC1155
      await escrow.connect(otherAcc).setDeposit(offerId, await otherAcc.getAddress(), AssetERC1155);

      const tx_3 = await escrow.connect(otherAcc).cancelDeposit(offerId, await otherAcc.getAddress());

      await expect(tx_3).to.emit(escrow, 'OfferCancelled').withArgs(offerId, await otherAcc.getAddress(), AssetERC1155.amount);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);
      expect(await erc1155.balanceOf(await otherAcc.getAddress(), AssetERC1155.tokenId)).to.eq(AssetERC1155.amount);
      expect(await erc1155.balanceOf(escrow.address, AssetERC1155.tokenId)).to.eq(0);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(0);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.assetAddress).to.be.eq(AssetERC1155.assetAddress);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.assetType).to.be.eq(AssetERC1155.assetType);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.tokenId).to.be.eq(AssetERC1155.tokenId);

      expect((await escrow.escrowDeposits(offerId)).escrowOfferStatusType).to.be.eq(EscrowOfferStatusType.OfferCancelled);
    });

    it('Should withdraw fees', async () => {
      const { escrow, erc20, otherAcc, deployer } = await loadFixture(fixture);

      const offerId = 55;

      const Price: AssetPriceStruct = {
        priceFeedAddress: await otherAcc.getAddress(),
        offerMaximumPrice: 0,
        offerMinimumPrice: 0
      }

      const AssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20.address,
        assetPrice: Price,
        amount: BigNumber.from('500000000000000000000'),
        tokenId: 0,
      };

      const feesAmount = BigNumber.from('5');

      await erc20.transfer(escrow.address, BigNumber.from(AssetERC20.amount));

      const balanceBefore = await erc20.balanceOf(await deployer.getAddress());

      // ERC20
      await escrow.connect(otherAcc).setDeposit(offerId, await otherAcc.getAddress(), AssetERC20);

      const tx_1 = await escrow.connect(otherAcc)['withdrawFees(uint256,uint256)'](offerId, feesAmount);

      await expect(tx_1).to.emit(escrow, 'FeesWithdrew').withArgs(offerId, await deployer.getAddress(), feesAmount);
      expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(BigNumber.from(AssetERC20.amount).sub(feesAmount));
      expect(await erc20.balanceOf(await deployer.getAddress())).to.eq(balanceBefore.add(feesAmount));
      expect(await erc20.balanceOf(escrow.address)).to.eq(BigNumber.from(AssetERC20.amount).sub(feesAmount));
      expect((await escrow.escrowDeposits(offerId)).depositAsset.amount).to.be.eq(BigNumber.from(AssetERC20.amount).sub(feesAmount));
    });
  });

  describe('Else/if', () => {
    it('Only dotc', async () => {
      const { escrow, otherAcc } = await loadFixture(fixture);

      const errorMsg = 'OnlyDotc';

      const Price: AssetPriceStruct = {
        priceFeedAddress: await otherAcc.getAddress(),
        offerMaximumPrice: 0,
        offerMinimumPrice: 0
      }

      const AssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: await otherAcc.getAddress(),
        assetPrice: Price,
        amount: BigNumber.from('500000000000000000000'),
        tokenId: 0,
      };

      await expect(escrow.setDeposit(0, await otherAcc.getAddress(), AssetERC20)).to.be.revertedWithCustomError(escrow, errorMsg);
      await expect(escrow.withdrawDeposit(0, 20, await otherAcc.getAddress())).to.be.revertedWithCustomError(escrow, errorMsg);
      await expect(escrow.cancelDeposit(0, await otherAcc.getAddress())).to.be.revertedWithCustomError(escrow, errorMsg);
      await expect(escrow['withdrawFees(uint256,uint256)'](0, await otherAcc.getAddress())).to.be.revertedWithCustomError(escrow, errorMsg);
    });

    it('Only manager', async () => {
      const { escrow, otherAcc } = await loadFixture(fixture);

      const errorMsg = 'OnlyManager';

      await expect(escrow.changeDotc(await otherAcc.getAddress())).to.be.revertedWithCustomError(escrow, errorMsg);
    });
  });
});
