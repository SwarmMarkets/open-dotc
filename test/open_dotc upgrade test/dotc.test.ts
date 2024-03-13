import { ethers, upgrades } from 'hardhat';
import { BigNumber, ContractFactory } from 'ethers';
import { expect } from 'chai';
import { DotcManager, DotcEscrow, Dotc, DotcV2, ERC20Mock_3, ERC721Mock, ERC1155Mock } from '../../typechain';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { AssetStruct, DotcOfferStruct } from 'typechain/contracts/OpenDotc/DotcV2';
import { OfferStructStruct } from 'typechain/contracts/OpenDotc/DotcV2';

describe('Dotc_Open', () => {

  async function fixture() {
    const [deployer, acc1, acc2] = await ethers.getSigners();

    const DotcManager: ContractFactory = await ethers.getContractFactory('DotcManager');
    const dotcManager = (await upgrades.deployProxy(DotcManager, [deployer.address])) as DotcManager;
    await dotcManager.deployed();

    const Dotc = await ethers.getContractFactory('Dotc');
    const dotc = (await upgrades.deployProxy(Dotc, [dotcManager.address])) as Dotc;
    await dotc.deployed();

    const DotcEscrow: ContractFactory = await ethers.getContractFactory('DotcEscrow');
    const escrow = (await upgrades.deployProxy(DotcEscrow, [dotcManager.address])) as DotcEscrow;
    await escrow.deployed();

    const ERC20: ContractFactory = await ethers.getContractFactory('ERC20Mock_3');
    const erc20_1: ERC20Mock_3 = (await ERC20.deploy(18)) as ERC20Mock_3;
    await erc20_1.deployed();
    const erc20_2: ERC20Mock_3 = (await ERC20.deploy(6)) as ERC20Mock_3;
    await erc20_2.deployed();

    await dotcManager.changeDotcAddress(dotc.address);
    await dotcManager.changeEscrowAddress(escrow.address);

    return {
      deployer,
      acc1,
      acc2,
      dotc,
      dotcManager,
      escrow,
      erc20_1,
      erc20_2,
    };
  }

  describe('Upgrade', () => {
    it('Should be upgraded correctly', async () => {
      const { deployer, acc1, acc2, dotc, erc20_1, erc20_2 } = await loadFixture(fixture);

      const now = await time.latest();

      const amountIn = 43;
      const amountOut = 104;

      const decimals_1 = await erc20_1.decimals();
      const decimals_2 = await erc20_2.decimals();
      const amountIn_asset = BigNumber.from(amountIn).mul(BigNumber.from(10).pow(decimals_1));
      const amountOut_asset = BigNumber.from(amountOut).mul(BigNumber.from(10).pow(decimals_2));

      await erc20_1.transfer(acc1.address, amountIn_asset.mul(2));
      await erc20_2.transfer(acc2.address, amountOut_asset.mul(2));

      await erc20_1.connect(acc1).approve(dotc.address, amountIn_asset.mul(2));
      await erc20_2.connect(acc2).approve(dotc.address, amountOut_asset.mul(2));

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

      await dotc.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, true, deployer.address, now + 200, now + 20);

      expect((await dotc.allOffers(0)).maker).to.eq(acc1.address);
      expect((await dotc.allOffers(0)).timelockPeriod).to.eq(now + 20);
      expect((await dotc.allOffers(0)).specialAddress).to.eq(deployer.address);

      const DotcV2: ContractFactory = await ethers.getContractFactory('DotcV2');

      const dotcV2Contract: DotcV2 = (await upgrades.upgradeProxy(
        dotc.address,
        DotcV2,
      )) as DotcV2;
      await dotcV2Contract.deployed();

      expect((await dotcV2Contract.allOffers(0)).maker).to.eq(acc1.address);
      expect((await dotcV2Contract.allOffers(0)).timelockPeriod).to.eq(now + 20);
      expect((await dotcV2Contract.allOffers(0)).terms).to.eq('');
      expect((await dotcV2Contract.allOffers(0)).specialAddresses).to.eq(deployer.address);

      const OfferStruct: OfferStructStruct = {
        isFullType: true,
        specialAddresses: [],
        expiryTimestamp: now + 200,
        timelockPeriod: now + 20,
        terms: 'terms'
      };

      await dotcV2Contract.connect(acc1).makeOffer(DepositAssetERC20, WithdrawalAssetERC20, OfferStruct);

      expect((await dotcV2Contract.allOffers(1)).maker).to.eq(acc1.address);
      expect((await dotcV2Contract.allOffers(1)).timelockPeriod).to.eq(now + 20);
      expect((await dotcV2Contract.allOffers(1)).terms).to.eq('terms');
    });
  });
});

