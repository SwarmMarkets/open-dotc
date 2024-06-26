import { ethers, upgrades } from 'hardhat';
import { BigNumber, ContractFactory, Signer } from 'ethers';
import { expect } from 'chai';
import {
  DotcEscrowV3 as DotcEscrow,
  ERC20Mock_2,
  ERC721Mock,
  ERC1155Mock,
  AssetHelper,
} from '../../../typechain';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { AssetStruct } from '../../helpers/StructuresV3';

describe('DotcEscrowV2_Open', () => {
  async function fixture() {
    const [deployer, otherAcc]: Signer[] = await ethers.getSigners();

    // Deploy AssetHelper library
    const AssetHelper: ContractFactory = await ethers.getContractFactory('AssetHelper');
    const assetHelper = await AssetHelper.deploy() as AssetHelper;
    await assetHelper.deployed();

    // Link AssetHelper library and deploy DotcEscrowV3 proxy
    const DotcEscrow: ContractFactory = await ethers.getContractFactory('DotcEscrowV3', {
      libraries: {
        AssetHelper: assetHelper.address,
      },
    });
    const escrow = await upgrades.deployProxy(DotcEscrow, [await deployer.getAddress()], { unsafeAllowLinkedLibraries: true }) as DotcEscrow;
    await escrow.deployed();

    // Deploy mock tokens
    const ERC20: ContractFactory = await ethers.getContractFactory('ERC20Mock_2');
    const erc20 = await ERC20.deploy() as ERC20Mock_2;
    await erc20.deployed();

    const ERC721: ContractFactory = await ethers.getContractFactory('ERC721Mock');
    const erc721 = await ERC721.deploy() as ERC721Mock;
    await erc721.deployed();

    const ERC1155: ContractFactory = await ethers.getContractFactory('ERC1155Mock');
    const erc1155 = await ERC1155.deploy() as ERC1155Mock;
    await erc1155.deployed();

    // Ensure the proxy contract is correctly initialized
    await escrow.changeDotc(await otherAcc.getAddress());

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
      const { escrow, deployer, otherAcc } = await loadFixture(fixture);

      expect(await escrow.dotc()).to.be.eq(await otherAcc.getAddress());
      expect(await escrow.feeReceiver()).to.be.eq(await deployer.getAddress());
      expect(await escrow.feeAmount()).to.be.eq(BigNumber.from(25).mul(BigNumber.from(10).pow(23)));

      expect(escrow.address).to.be.properAddress;

    });

    it('Should be initialized', async () => {
      const { escrow } = await loadFixture(fixture);

      await expect(escrow.initialize(escrow.address)).to.be.revertedWithCustomError(escrow, 'InvalidInitialization');
    });

    it('Should support interface', async () => {
      const { escrow } = await loadFixture(fixture);

      const IERC165_interface = '0x01ffc9a7';

      expect(await escrow.supportsInterface(IERC165_interface)).to.be.true;
    });
  });

  describe('Write functions', () => {
    it('Should set deposit', async () => {
      const { escrow, erc20, otherAcc } = await loadFixture(fixture);

      let offerId = 55;

      let AssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: BigNumber.from('500000000000000000000'),
        tokenId: 0,
      };

      const tx = await escrow.connect(otherAcc).setDeposit(offerId, await otherAcc.getAddress(), AssetERC20);

      await expect(tx).to.emit(escrow, 'OfferDeposited').withArgs(offerId, await otherAcc.getAddress(), AssetERC20.amount);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(AssetERC20.amount);
      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(AssetERC20.assetAddress);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(AssetERC20.assetType);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(AssetERC20.tokenId);

      ++offerId;

      AssetERC20 = {
        assetType: 1,
        assetAddress: erc20.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 1,
        tokenId: 0,
      };

      await escrow.connect(otherAcc).setDeposit(offerId, await otherAcc.getAddress(), AssetERC20);

      await expect(escrow.connect(otherAcc).withdrawFees(offerId, 1)).to.be.revertedWithCustomError(
        escrow,
        'FeesAmountEqZero',
      );
    });

    it('Should withdraw deposit', async () => {
      const { escrow, erc20, erc721, erc1155, otherAcc, deployer } = await loadFixture(fixture);

      let offerId = 55;

      let AssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: BigNumber.from('500000000000000000000'),
        tokenId: 0,
      };

      const AssetERC721: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 1,
        tokenId: 4,
      };

      const AssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 202,
        tokenId: 3,
      };

      const standardizedERC20Amount = standardizeNumber(
        BigNumber.from(AssetERC20.amount).sub(20),
        await erc20.decimals(),
      );

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

      const tx_1 = await escrow.connect(otherAcc).withdrawDeposit(offerId, standardizedERC20Amount, await otherAcc.getAddress());

      await expect(tx_1)
        .to.emit(escrow, 'OfferWithdrawn')
        .withArgs(offerId, await otherAcc.getAddress(), BigNumber.from(AssetERC20.amount).sub(20));
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(20);
      expect(await erc20.balanceOf(await otherAcc.getAddress())).to.eq(BigNumber.from(AssetERC20.amount).sub(20));
      expect(await erc20.balanceOf(escrow.address)).to.eq(40);

      ++offerId;

      AssetERC20 = {
        assetType: 1,
        assetAddress: erc20.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
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
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 1,
        tokenId: 0,
      };

      await escrow.connect(otherAcc).setDeposit(offerId, await otherAcc.getAddress(), AssetERC20);

      await expect(
        escrow.connect(otherAcc).withdrawDeposit(offerId, 1, await otherAcc.getAddress()),
      ).to.be.revertedWithCustomError(escrow, 'AmountToWithdrawEqZero');

      ++offerId;

      // ERC721
      await escrow.connect(otherAcc).setDeposit(offerId, await otherAcc.getAddress(), AssetERC721);

      const tx_2 = await escrow.connect(otherAcc).withdrawDeposit(offerId, AssetERC721.amount, await otherAcc.getAddress());

      await expect(tx_2).to.emit(escrow, 'OfferWithdrawn').withArgs(offerId, await otherAcc.getAddress(), AssetERC721.amount);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect(await erc721.ownerOf(AssetERC721.tokenId)).to.eq(await otherAcc.getAddress());

      ++offerId;

      // ERC1155
      await escrow.connect(otherAcc).setDeposit(offerId, await otherAcc.getAddress(), AssetERC1155);

      const tx_3 = await escrow.connect(otherAcc).withdrawDeposit(offerId, AssetERC1155.amount, await otherAcc.getAddress());

      await expect(tx_3).to.emit(escrow, 'OfferWithdrawn').withArgs(offerId, await otherAcc.getAddress(), AssetERC1155.amount);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect(await erc1155.balanceOf(await otherAcc.getAddress(), AssetERC1155.tokenId)).to.eq(AssetERC1155.amount);
      expect(await erc1155.balanceOf(escrow.address, AssetERC1155.tokenId)).to.eq(0);
    });

    it('Should cancel deposit', async () => {
      const { escrow, erc20, erc721, erc1155, otherAcc, deployer } = await loadFixture(fixture);

      let offerId = 55;

      let AssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: BigNumber.from('500000000000000000000'),
        tokenId: 0,
      };

      const AssetERC721: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: 1,
        tokenId: 4,
      };

      const AssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
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
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect(await erc20.balanceOf(await otherAcc.getAddress())).to.eq(BigNumber.from(AssetERC20.amount));
      expect(await erc20.balanceOf(escrow.address)).to.eq(0);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(ethers.constants.AddressZero);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(0);

      ++offerId;

      AssetERC20 = {
        assetType: 1,
        assetAddress: erc20.address,
        assetPriceFeedAddress: await otherAcc.getAddress(),
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
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect(await erc721.ownerOf(AssetERC721.tokenId)).to.eq(await otherAcc.getAddress());
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(ethers.constants.AddressZero);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(0);

      ++offerId;

      // ERC1155
      await escrow.connect(otherAcc).setDeposit(offerId, await otherAcc.getAddress(), AssetERC1155);

      const tx_3 = await escrow.connect(otherAcc).cancelDeposit(offerId, await otherAcc.getAddress());

      await expect(tx_3).to.emit(escrow, 'OfferCancelled').withArgs(offerId, await otherAcc.getAddress(), AssetERC1155.amount);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect(await erc1155.balanceOf(await otherAcc.getAddress(), AssetERC1155.tokenId)).to.eq(AssetERC1155.amount);
      expect(await erc1155.balanceOf(escrow.address, AssetERC1155.tokenId)).to.eq(0);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(ethers.constants.AddressZero);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(0);
    });
  });

  describe('Else/if', () => {
    it('Only dotc', async () => {
      const { escrow, otherAcc } = await loadFixture(fixture);

      const errorMsg = 'OnlyDotc';

      const AssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: await otherAcc.getAddress(),
        assetPriceFeedAddress: await otherAcc.getAddress(),
        amount: BigNumber.from('500000000000000000000'),
        tokenId: 0,
      };

      await expect(escrow.setDeposit(0, await otherAcc.getAddress(), AssetERC20)).to.be.revertedWithCustomError(escrow, errorMsg);
      await expect(escrow.withdrawDeposit(0, 20, await otherAcc.getAddress())).to.be.revertedWithCustomError(escrow, errorMsg);
      await expect(escrow.cancelDeposit(0, await otherAcc.getAddress())).to.be.revertedWithCustomError(escrow, errorMsg);
      await expect(escrow.withdrawFees(0, await otherAcc.getAddress())).to.be.revertedWithCustomError(escrow, errorMsg);
    });

    it('Change Manager calls', async () => {
      const { escrow, otherAcc } = await loadFixture(fixture);

      await expect(escrow.connect(otherAcc).changeDotc(await otherAcc.getAddress())).to.be.revertedWithCustomError(escrow, 'OwnableUnauthorizedAccount');
    });

    it('Zero passing error', async () => {
      const { escrow } = await loadFixture(fixture);

      const error = 'ZeroAddressPassed';

      await expect(escrow.changeDotc(ethers.constants.AddressZero)).to.be.revertedWithCustomError(escrow, error);
      await expect(escrow.changeFeeReceiver(ethers.constants.AddressZero)).to.be.revertedWithCustomError(escrow, error);
    });
  });
});

function standardizeNumber(amount: BigNumber, decimals: number) {
  const BPS = BigNumber.from('1000000000000000000000000000');
  const dec = BigNumber.from(10).pow(decimals);
  return BPS.mul(amount).div(dec);
}