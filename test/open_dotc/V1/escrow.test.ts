import { ethers, upgrades } from 'hardhat';
import { BigNumber, ContractFactory } from 'ethers';
import { expect } from 'chai';
import { DotcManager, DotcEscrow, ERC20Mock_2, ERC721Mock, ERC1155Mock } from '../../../typechain';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { AssetStruct } from 'typechain/contracts/OpenDotc/v1/Dotc';

describe.only('DotcEscrow_Open', () => {
  async function fixture() {
    const [deployer, otherAcc] = await ethers.getSigners();

    const DotcManager: ContractFactory = await ethers.getContractFactory('DotcManager');
    const dotcManager = (await upgrades.deployProxy(DotcManager, [deployer.address])) as DotcManager;
    await dotcManager.deployed();

    const DotcEscrow: ContractFactory = await ethers.getContractFactory('DotcEscrow');
    const escrow = (await upgrades.deployProxy(DotcEscrow, [dotcManager.address])) as DotcEscrow;
    await escrow.deployed();

    const ERC20: ContractFactory = await ethers.getContractFactory('ERC20Mock_2');
    const erc20: ERC20Mock_2 = (await ERC20.deploy()) as ERC20Mock_2;
    await erc20.deployed();
    const ERC721: ContractFactory = await ethers.getContractFactory('ERC721Mock');
    const erc721: ERC721Mock = (await ERC721.deploy()) as ERC721Mock;
    await erc721.deployed();
    const ERC1155: ContractFactory = await ethers.getContractFactory('ERC1155Mock');
    const erc1155: ERC1155Mock = (await ERC1155.deploy()) as ERC1155Mock;
    await erc1155.deployed();

    await dotcManager.changeDotcAddress(otherAcc.address);

    return {
      deployer,
      otherAcc,
      dotcManager,
      escrow,
      erc20,
      erc721,
      erc1155,
    };
  }

  describe('Deployment', () => {
    it('Should be deployed correctly', async () => {
      const { escrow, dotcManager, otherAcc } = await loadFixture(fixture);

      expect(await escrow.manager()).to.be.eq(dotcManager.address);
      expect(await dotcManager.dotc()).to.be.eq(otherAcc.address);

      expect(escrow.address).to.be.properAddress;
      expect(dotcManager.address).to.be.properAddress;
    });

    it('Should be initialized', async () => {
      const { dotcManager, escrow } = await loadFixture(fixture);

      await expect(dotcManager.initialize(escrow.address)).to.be.revertedWith('Initializable: contract is already initialized');
      await expect(escrow.initialize(escrow.address)).to.be.revertedWith('Initializable: contract is already initialized');
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
        amount: BigNumber.from('500000000000000000000'),
        tokenId: 0,
      };

      const tx = await escrow.connect(otherAcc).setDeposit(offerId, otherAcc.address, AssetERC20);

      await expect(tx).to.emit(escrow, 'OfferDeposited').withArgs(offerId, otherAcc.address, AssetERC20.amount);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(AssetERC20.amount);
      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(AssetERC20.assetAddress);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(AssetERC20.assetType);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(AssetERC20.tokenId);

      ++offerId;

      AssetERC20 = {
        assetType: 1,
        assetAddress: erc20.address,
        amount: 1,
        tokenId: 0,
      };

      await escrow.connect(otherAcc).setDeposit(offerId, otherAcc.address, AssetERC20);

      await expect(escrow.connect(otherAcc).withdrawFees(offerId, 1)).to.be.revertedWith('Escrow: fees amount = 0');
    });

    it('Should withdraw deposit', async () => {
      const { escrow, erc20, erc721, erc1155, otherAcc, deployer } = await loadFixture(fixture);

      let offerId = 55;

      let AssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20.address,
        amount: BigNumber.from('500000000000000000000'),
        tokenId: 0,
      };

      const AssetERC721: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        amount: 1,
        tokenId: 4,
      };

      const AssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: 202,
        tokenId: 3,
      };

      const standardizedERC20Amount = standardizeNumber(
        BigNumber.from(AssetERC20.amount).sub(20),
        await erc20.decimals(),
      );

      await erc20.transfer(escrow.address, BigNumber.from(AssetERC20.amount).add(20));
      expect(await erc20.balanceOf(escrow.address)).to.eq(BigNumber.from(AssetERC20.amount).add(20));
      await erc721['safeTransferFrom(address,address,uint256)'](deployer.address, escrow.address, AssetERC721.tokenId);
      expect(await erc721.ownerOf(AssetERC721.tokenId)).to.eq(escrow.address);
      await erc1155.safeTransferFrom(
        deployer.address,
        escrow.address,
        AssetERC1155.tokenId,
        AssetERC1155.amount,
        '0x00',
      );
      expect(await erc1155.balanceOf(escrow.address, AssetERC1155.tokenId)).to.eq(AssetERC1155.amount);

      // ERC20
      await escrow.connect(otherAcc).setDeposit(offerId, otherAcc.address, AssetERC20);

      const tx_1 = await escrow.connect(otherAcc).withdrawDeposit(offerId, standardizedERC20Amount, otherAcc.address);

      await expect(tx_1)
        .to.emit(escrow, 'OfferWithdrawn')
        .withArgs(offerId, otherAcc.address, BigNumber.from(AssetERC20.amount).sub(20));
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(20);
      expect(await erc20.balanceOf(otherAcc.address)).to.eq(BigNumber.from(AssetERC20.amount).sub(20));
      expect(await erc20.balanceOf(escrow.address)).to.eq(40);

      ++offerId;

      AssetERC20 = {
        assetType: 1,
        assetAddress: erc20.address,
        amount: 0,
        tokenId: 0,
      };

      await escrow.connect(otherAcc).setDeposit(offerId, otherAcc.address, AssetERC20);

      await expect(escrow.connect(otherAcc).withdrawDeposit(offerId, 1, otherAcc.address)).to.be.revertedWith(
        'Escrow: assets amount = 0',
      );

      ++offerId;

      AssetERC20 = {
        assetType: 1,
        assetAddress: erc20.address,
        amount: 1,
        tokenId: 0,
      };

      await escrow.connect(otherAcc).setDeposit(offerId, otherAcc.address, AssetERC20);

      await expect(escrow.connect(otherAcc).withdrawDeposit(offerId, 1, otherAcc.address)).to.be.revertedWith(
        'Escrow: amount to withdraw = 0',
      );

      ++offerId;

      // ERC721
      await escrow.connect(otherAcc).setDeposit(offerId, otherAcc.address, AssetERC721);

      const tx_2 = await escrow.connect(otherAcc).withdrawDeposit(offerId, AssetERC721.amount, otherAcc.address);

      await expect(tx_2).to.emit(escrow, 'OfferWithdrawn').withArgs(offerId, otherAcc.address, AssetERC721.amount);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect(await erc721.ownerOf(AssetERC721.tokenId)).to.eq(otherAcc.address);

      ++offerId;

      // ERC1155
      await escrow.connect(otherAcc).setDeposit(offerId, otherAcc.address, AssetERC1155);

      const tx_3 = await escrow.connect(otherAcc).withdrawDeposit(offerId, AssetERC1155.amount, otherAcc.address);

      await expect(tx_3).to.emit(escrow, 'OfferWithdrawn').withArgs(offerId, otherAcc.address, AssetERC1155.amount);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect(await erc1155.balanceOf(otherAcc.address, AssetERC1155.tokenId)).to.eq(AssetERC1155.amount);
      expect(await erc1155.balanceOf(escrow.address, AssetERC1155.tokenId)).to.eq(0);
    });

    it('Should cancel deposit', async () => {
      const { escrow, erc20, erc721, erc1155, otherAcc, deployer } = await loadFixture(fixture);

      let offerId = 55;

      let AssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20.address,
        amount: BigNumber.from('500000000000000000000'),
        tokenId: 0,
      };

      const AssetERC721: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        amount: 1,
        tokenId: 4,
      };

      const AssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: 202,
        tokenId: 3,
      };

      await erc20.transfer(escrow.address, BigNumber.from(AssetERC20.amount));
      await erc721['safeTransferFrom(address,address,uint256)'](deployer.address, escrow.address, AssetERC721.tokenId);
      await erc1155.safeTransferFrom(
        deployer.address,
        escrow.address,
        AssetERC1155.tokenId,
        AssetERC1155.amount,
        '0x00',
      );

      // ERC20
      await escrow.connect(otherAcc).setDeposit(offerId, otherAcc.address, AssetERC20);

      const tx_1 = await escrow.connect(otherAcc).cancelDeposit(offerId, otherAcc.address);

      await expect(tx_1).to.emit(escrow, 'OfferCancelled').withArgs(offerId, otherAcc.address, AssetERC20.amount);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect(await erc20.balanceOf(otherAcc.address)).to.eq(BigNumber.from(AssetERC20.amount));
      expect(await erc20.balanceOf(escrow.address)).to.eq(0);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(ethers.constants.AddressZero);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(0);

      ++offerId;

      AssetERC20 = {
        assetType: 1,
        assetAddress: erc20.address,
        amount: 0,
        tokenId: 0,
      };

      await escrow.connect(otherAcc).setDeposit(offerId, otherAcc.address, AssetERC20);

      await expect(escrow.connect(otherAcc).cancelDeposit(offerId, otherAcc.address)).to.be.revertedWith(
        'Escrow: amount to cancel = 0',
      );

      ++offerId;

      // ERC721
      await escrow.connect(otherAcc).setDeposit(offerId, otherAcc.address, AssetERC721);

      const tx_2 = await escrow.connect(otherAcc).cancelDeposit(offerId, otherAcc.address);

      await expect(tx_2).to.emit(escrow, 'OfferCancelled').withArgs(offerId, otherAcc.address, AssetERC721.amount);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect(await erc721.ownerOf(AssetERC721.tokenId)).to.eq(otherAcc.address);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).assetAddress).to.be.eq(ethers.constants.AddressZero);
      expect((await escrow.assetDeposits(offerId)).assetType).to.be.eq(0);
      expect((await escrow.assetDeposits(offerId)).tokenId).to.be.eq(0);

      ++offerId;

      // ERC1155
      await escrow.connect(otherAcc).setDeposit(offerId, otherAcc.address, AssetERC1155);

      const tx_3 = await escrow.connect(otherAcc).cancelDeposit(offerId, otherAcc.address);

      await expect(tx_3).to.emit(escrow, 'OfferCancelled').withArgs(offerId, otherAcc.address, AssetERC1155.amount);
      expect((await escrow.assetDeposits(offerId)).amount).to.be.eq(0);
      expect(await erc1155.balanceOf(otherAcc.address, AssetERC1155.tokenId)).to.eq(AssetERC1155.amount);
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

      const errorMsg = 'Escrow: Dotc calls only';

      const AssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: otherAcc.address,
        amount: BigNumber.from('500000000000000000000'),
        tokenId: 0,
      };

      await expect(escrow.setDeposit(0, otherAcc.address, AssetERC20)).to.be.revertedWith(errorMsg);
      await expect(escrow.withdrawDeposit(0, 20, otherAcc.address)).to.be.revertedWith(errorMsg);
      await expect(escrow.cancelDeposit(0, otherAcc.address)).to.be.revertedWith(errorMsg);
      await expect(escrow.withdrawFees(0, otherAcc.address)).to.be.revertedWith(errorMsg);
    });

    it('Change Manager calls', async () => {
      const { escrow, otherAcc } = await loadFixture(fixture);

      await expect(escrow.changeManager(otherAcc.address)).to.be.revertedWith('Escrow: Manager calls only');
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
