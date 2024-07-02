import { ethers, upgrades } from 'hardhat';
import { BigNumber, ContractFactory, Signer } from 'ethers';
import { expect } from 'chai';
import {
  DotcManagerV3,
} from '../../../typechain';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

describe('DotcManagerV3', () => {
  async function fixture() {
    const [deployer, acc1]: Signer[] = await ethers.getSigners();

    const DotcManager: ContractFactory = await ethers.getContractFactory('DotcManagerV3');
    const dotcManager = (await upgrades.deployProxy(DotcManager, [await deployer.getAddress()])) as DotcManagerV3;
    await dotcManager.deployed();

    return {
      deployer,
      acc1,
      dotcManager,
    };
  }

  describe('Deployment', () => {
    it('Should be deployed correctly', async () => {
      const { dotcManager, deployer } = await loadFixture(fixture);

      expect(await dotcManager.feeReceiver()).to.be.eq(await deployer.getAddress());
      expect(await dotcManager.owner()).to.be.eq(await deployer.getAddress());
      expect(await dotcManager.feeAmount()).to.be.eq(BigNumber.from('2500000000000000000000000'));
      expect(await dotcManager.revSharePercentage()).to.be.eq(8000);

      expect(dotcManager.address).to.be.properAddress;
    });

    it('Should be initialized', async () => {
      const { dotcManager } = await loadFixture(fixture);

      await expect(dotcManager.initialize(dotcManager.address)).to.be.revertedWithCustomError(
        dotcManager,
        'InvalidInitialization',
      );
    });
  });

  describe('Write functions', () => {
    it('Should change dotc', async () => {
      const { dotcManager, acc1, deployer } = await loadFixture(fixture);

      const tx = await dotcManager.changeDotc(await acc1.getAddress());

      await expect(tx).to.emit(dotcManager, 'DotcAddressSet').withArgs(await deployer.getAddress(), await acc1.getAddress());
      expect(await dotcManager.dotc()).to.be.eq(await acc1.getAddress());
    });

    it('Should change escrow', async () => {
      const { dotcManager, acc1, deployer } = await loadFixture(fixture);

      const tx = await dotcManager.changeEscrow(await acc1.getAddress());

      await expect(tx).to.emit(dotcManager, 'EscrowAddressSet').withArgs(await deployer.getAddress(), await acc1.getAddress());
      expect(await dotcManager.escrow()).to.be.eq(await acc1.getAddress());
    });

    it('Should change fees', async () => {
      const { dotcManager, acc1, deployer } = await loadFixture(fixture);

      const tx = await dotcManager.changeFees(await acc1.getAddress(), 0, 0);

      await expect(tx).to.emit(dotcManager, 'FeesReceiverSet').withArgs(await deployer.getAddress(), await acc1.getAddress());
      expect(await dotcManager.feeReceiver()).to.be.eq(await acc1.getAddress());
    });

    it('Should change fee amount', async () => {
      const { dotcManager, deployer } = await loadFixture(fixture);

      const tx = await dotcManager.changeFees(ethers.constants.AddressZero, 100, 0);

      await expect(tx).to.emit(dotcManager, 'FeesAmountSet').withArgs(await deployer.getAddress(), 100);
      expect(await dotcManager.feeAmount()).to.be.eq(100);
    });

    it('Should change rev share percentage', async () => {
      const { dotcManager, deployer } = await loadFixture(fixture);

      const tx = await dotcManager.changeFees(ethers.constants.AddressZero, 0, 100);

      await expect(tx).to.emit(dotcManager, 'RevShareSet').withArgs(await deployer.getAddress(), 100);
      expect(await dotcManager.revSharePercentage()).to.be.eq(100);
    });
  });

  describe('Else/if', () => {
    it('Only owner', async () => {
      const { dotcManager, acc1 } = await loadFixture(fixture);

      const errorMsg = 'OwnableUnauthorizedAccount';

      const acc1Call = dotcManager.connect(acc1);

      await expect(acc1Call.changeDotc(await acc1.getAddress())).to.be.revertedWithCustomError(dotcManager, errorMsg);
      await expect(acc1Call.changeEscrow(await acc1.getAddress())).to.be.revertedWithCustomError(dotcManager, errorMsg);
      await expect(acc1Call.changeDotcInEscrow()).to.be.revertedWithCustomError(dotcManager, errorMsg);
      await expect(acc1Call.changeEscrowInDotc()).to.be.revertedWithCustomError(dotcManager, errorMsg);
      await expect(acc1Call.changeFees(await acc1.getAddress(), 0, 0)).to.be.revertedWithCustomError(
        dotcManager,
        errorMsg,
      );
    });

    it('Zero address check', async () => {
      const { dotcManager } = await loadFixture(fixture);

      const zeroAddress = ethers.constants.AddressZero;

      const errorMsg = 'ZeroAddressPassed';

      await expect(dotcManager.changeDotc(zeroAddress)).to.be.revertedWithCustomError(dotcManager, errorMsg);
      await expect(dotcManager.changeEscrow(zeroAddress)).to.be.revertedWithCustomError(dotcManager, errorMsg);
    });
  });
});