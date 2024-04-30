import { ethers, upgrades } from 'hardhat';
import { BigNumber, ContractFactory } from 'ethers';
import { expect } from 'chai';
import { DotcManagerV2 as DotcManager, ERC20Mock_2, ERC721Mock, ERC1155Mock, EscrowFalseMock, DotcFalseMock, DotcTrueMock } from '../../../typechain';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { AssetStruct } from '../../helpers/Structures';

describe('DotcManagerV2_Open', () => {
  async function fixture() {
    const [deployer, acc1] = await ethers.getSigners();

    const DotcManager: ContractFactory = await ethers.getContractFactory('DotcManagerV2');
    const EscrowFalseMock: ContractFactory = await ethers.getContractFactory('EscrowFalseMock');
    const DotcFalseMock: ContractFactory = await ethers.getContractFactory('DotcFalseMock');
    const DotcTrueMock: ContractFactory = await ethers.getContractFactory('DotcTrueMock');

    const dotcManager = (await upgrades.deployProxy(DotcManager, [deployer.address])) as DotcManager;
    await dotcManager.deployed();

    const escrow = (await EscrowFalseMock.deploy()) as EscrowFalseMock;
    await escrow.deployed();
    const dotcFalse = (await DotcFalseMock.deploy()) as DotcFalseMock;
    await dotcFalse.deployed();
    const dotcTrue = (await DotcTrueMock.deploy()) as DotcTrueMock;
    await dotcTrue.deployed();

    const ERC20: ContractFactory = await ethers.getContractFactory('ERC20Mock_2');
    const erc20: ERC20Mock_2 = (await ERC20.deploy()) as ERC20Mock_2;
    await erc20.deployed();
    const ERC721: ContractFactory = await ethers.getContractFactory('ERC721Mock');
    const erc721: ERC721Mock = (await ERC721.deploy()) as ERC721Mock;
    await erc721.deployed();
    const ERC1155: ContractFactory = await ethers.getContractFactory('ERC1155Mock');
    const erc1155: ERC1155Mock = (await ERC1155.deploy()) as ERC1155Mock;
    await erc1155.deployed();

    return {
      deployer,
      acc1,
      dotcManager,
      escrow,
      dotcFalse,
      dotcTrue,
      erc20,
      erc721,
      erc1155,
    };
  }

  describe('Deployment', () => {
    it('Should be deployed correctly', async () => {
      const { dotcManager, deployer } = await loadFixture(fixture);

      expect(await dotcManager.feeReceiver()).to.be.eq(deployer.address);
      expect(await dotcManager.owner()).to.be.eq(deployer.address);
      expect(await dotcManager.feeAmount()).to.be.eq(BigNumber.from('2500000000000000000000000'));

      expect(dotcManager.address).to.be.properAddress;
    });

    it('Should be initialized', async () => {
      const { dotcManager } = await loadFixture(fixture);

      await expect(dotcManager.initialize(dotcManager.address)).to.be.revertedWithCustomError(dotcManager, 'InvalidInitialization');
    });
  });

  describe('Write functions', () => {
    it('Should change escrow', async () => {
      const { dotcManager, acc1, deployer } = await loadFixture(fixture);

      const tx = await dotcManager.changeEscrowAddress(acc1.address);

      await expect(tx).to.emit(dotcManager, 'EscrowAddressSet').withArgs(deployer.address, acc1.address);
      expect(await dotcManager.escrow()).to.be.eq(acc1.address);
    });

    it('Should change dotc', async () => {
      const { dotcManager, acc1, deployer } = await loadFixture(fixture);

      const tx = await dotcManager.changeDotcAddress(acc1.address);

      await expect(tx).to.emit(dotcManager, 'DotcSet').withArgs(deployer.address, acc1.address);
      expect(await dotcManager.dotc()).to.be.eq(acc1.address);
    });

    it('Should change fee receiver', async () => {
      const { dotcManager, acc1, deployer } = await loadFixture(fixture);

      const tx = await dotcManager.changeFeeReceiver(acc1.address);

      await expect(tx).to.emit(dotcManager, 'FeeReceiverSet').withArgs(deployer.address, acc1.address);
      expect(await dotcManager.feeReceiver()).to.be.eq(acc1.address);
    });

    it('Should change fee amount', async () => {
      const { dotcManager, deployer } = await loadFixture(fixture);

      const tx = await dotcManager.changeFeeAmount(100);

      await expect(tx).to.emit(dotcManager, 'FeeAmountSet').withArgs(deployer.address, 100);
      expect(await dotcManager.feeAmount()).to.be.eq(100);
    });
  });

  describe('Read functions', () => {
    it('Should return true', async () => {
      const { dotcManager, erc20, erc721, erc1155, deployer } = await loadFixture(fixture);

      const AssetERC20: Asset = {
        assetType: 1,
        assetAddress: erc20.address,
        amount: BigNumber.from('500000000000000000000'),
        tokenId: 0,
      };

      const AssetERC721: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        amount: 0,
        tokenId: 4,
      };

      const AssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: 202,
        tokenId: 3,
      };

      const tx_erc20 = await dotcManager.checkAssetOwner(AssetERC20, deployer.address, AssetERC20.amount);
      const tx_erc721 = await dotcManager.checkAssetOwner(AssetERC721, deployer.address, AssetERC721.amount);
      const tx_erc1155 = await dotcManager.checkAssetOwner(AssetERC1155, deployer.address, AssetERC1155.amount);

      expect(tx_erc20).to.be.eq(1);
      expect(tx_erc721).to.be.eq(2);
      expect(tx_erc1155).to.be.eq(3);
    });

    it('Should return false', async () => {
      const { dotcManager, erc20, erc721, erc1155, deployer, acc1 } = await loadFixture(fixture);

      const Asset0: AssetStruct = {
        assetType: 0,
        assetAddress: erc20.address,
        amount: BigNumber.from('50000000000000000000000000000'),
        tokenId: 0,
      };

      const AssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20.address,
        amount: BigNumber.from('50000000000000000000000000000'),
        tokenId: 0,
      };

      const AssetERC721: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        amount: 0,
        tokenId: 4,
      };

      const NonExistentAssetERC721: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        amount: 0,
        tokenId: 1000,
      };

      const AssetERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: 204404004,
        tokenId: 3,
      };

      const FakeERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc1155.address,
        amount: BigNumber.from('50000000000000000000000000000'),
        tokenId: 0,
      };

      const FakeERC721: AssetStruct = {
        assetType: 2,
        assetAddress: erc1155.address,
        amount: 0,
        tokenId: 1000,
      };

      const IncorrectTypeERC1155: AssetStruct = {
        assetType: 3,
        assetAddress: erc721.address,
        amount: 1,
        tokenId: 3,
      };

      const ERC20balance = await erc20.balanceOf(deployer.address);
      const ERC1155balance = await erc1155.balanceOf(deployer.address, AssetERC1155.tokenId);

      await expect(dotcManager.checkAssetOwner(AssetERC20, deployer.address, AssetERC20.amount)).to.be.revertedWithCustomError(dotcManager,
        'AddressHaveNoERC20',
      ).withArgs(deployer.address, AssetERC20.assetAddress, ERC20balance, AssetERC20.amount);

      await expect(dotcManager.checkAssetOwner(NonExistentAssetERC721, deployer.address, NonExistentAssetERC721.amount)).to.be.revertedWith(
        'ERC721: owner query for nonexistent token',
      );
      await expect(dotcManager.checkAssetOwner(FakeERC721, deployer.address, FakeERC721.amount)).to.be.revertedWithCustomError(dotcManager,
        'IncorrectAssetTypeForAddress',
      ).withArgs(FakeERC721.assetAddress, FakeERC721.assetType);
      await expect(dotcManager.checkAssetOwner(AssetERC721, acc1.address, AssetERC721.amount)).to.be.revertedWithCustomError(dotcManager,
        'AddressHaveNoERC721',
      ).withArgs(acc1.address, AssetERC721.assetAddress, AssetERC721.tokenId);

      await expect(dotcManager.checkAssetOwner(AssetERC1155, deployer.address, AssetERC1155.amount)).to.be.revertedWithCustomError(dotcManager,
        'AddressHaveNoERC1155',
      ).withArgs(deployer.address, AssetERC1155.assetAddress, AssetERC1155.tokenId, ERC1155balance, AssetERC1155.amount);

      await expect(dotcManager.checkAssetOwner(Asset0, deployer.address, Asset0.amount)).to.be.revertedWithCustomError(dotcManager,
        'UnsupportedAssetType',
      ).withArgs(Asset0.assetType);

      await expect(dotcManager.checkAssetOwner(FakeERC20, deployer.address, FakeERC20.amount)).to.be.reverted;
      await expect(dotcManager.checkAssetOwner(IncorrectTypeERC1155, deployer.address, IncorrectTypeERC1155.amount)).to.be.reverted;
    });

    it('Should standardize asset', async () => {
      const { dotcManager, erc20, erc721, erc1155, deployer } = await loadFixture(fixture);

      const AssetERC20: AssetStruct = {
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

      const stadnardizedAsset = standardizeNumber(BigNumber.from(AssetERC20.amount), await erc20.decimals());
      const stadnardizedAsset721 = standardizeNumber(BigNumber.from(AssetERC721.amount), 1);
      const stadnardizedAsset1155 = standardizeNumber(BigNumber.from(AssetERC1155.amount), 1);
      const stadnardizedERC20 = standardizeNumber(BigNumber.from(30), await erc20.decimals());
      const stadnardized = standardizeNumber(BigNumber.from(30), 18);

      //console.log(stadnardizedAsset, "\n", stadnardizedERC20, "\n", stadnardized, "\n", stadnardizedAsset721, "\n", stadnardizedAsset1155)
      const unstadnardizedAsset = unstandardizeNumber(stadnardizedERC20, await erc20.decimals());

      const standardizeAsset_1 = await dotcManager['standardizeAsset((uint8,address,uint256,uint256))'](AssetERC20);
      const standardizeAsset_2 = await dotcManager['standardizeAsset((uint8,address,uint256,uint256),address)'](
        AssetERC20,
        deployer.address,
      );
      const standardizeERC20 = await dotcManager['standardizeNumber(uint256,address)'](30, erc20.address);
      const standardize = await dotcManager['standardizeNumber(uint256,uint8)'](30, 18);

      const standardizeAsset721_1 = await dotcManager['standardizeAsset((uint8,address,uint256,uint256))'](AssetERC721);
      const standardizeAsset721_2 = await dotcManager['standardizeAsset((uint8,address,uint256,uint256),address)'](
        AssetERC721,
        deployer.address,
      );
      const standardizeAsset1155_1 = await dotcManager['standardizeAsset((uint8,address,uint256,uint256))'](
        AssetERC1155,
      );
      const standardizeAsset1155_2 = await dotcManager['standardizeAsset((uint8,address,uint256,uint256),address)'](
        AssetERC1155,
        deployer.address,
      );

      expect(standardizeAsset_1).to.eq(stadnardizedAsset);
      expect(standardizeAsset_2).to.eq(stadnardizedAsset);
      expect(standardizeERC20).to.eq(stadnardizedERC20);
      expect(standardize).to.eq(stadnardized);

      expect(standardizeAsset721_1).to.eq(stadnardizedAsset721);
      expect(standardizeAsset721_2).to.eq(stadnardizedAsset721);
      expect(standardizeAsset1155_1).to.eq(stadnardizedAsset1155);
      expect(standardizeAsset1155_2).to.eq(stadnardizedAsset1155);

      const AssetERC20_S: AssetStruct = {
        assetType: 1,
        assetAddress: erc20.address,
        amount: stadnardizedAsset,
        tokenId: 0,
      };

      const AssetERC721_S: AssetStruct = {
        assetType: 2,
        assetAddress: erc721.address,
        amount: stadnardizedAsset721,
        tokenId: 4,
      };

      const AssetERC1155_S: AssetStruct = {
        assetType: 3,
        assetAddress: erc1155.address,
        amount: stadnardizedAsset1155,
        tokenId: 3,
      };

      const unstandardizeAsset_2 = await dotcManager.unstandardizeAsset(AssetERC20_S);
      const unstandardizeERC20 = await dotcManager['unstandardizeNumber(uint256,address)'](
        standardizeERC20,
        erc20.address,
      );
      const unstandardize = await dotcManager['unstandardizeNumber(uint256,uint8)'](standardize, 18);

      const unstandardizeAsset721_1 = await dotcManager.unstandardizeAsset(AssetERC721_S);
      const unstandardizeAsset721_2 = await dotcManager.unstandardizeAsset(AssetERC721_S);
      const unstandardizeAsset1155_1 = await dotcManager.unstandardizeAsset(AssetERC1155_S);
      const unstandardizeAsset1155_2 = await dotcManager.unstandardizeAsset(AssetERC1155_S);

      expect(unstandardizeAsset_2).to.eq(AssetERC20.amount);
      expect(unstandardizeERC20).to.eq(30);
      expect(unstandardize).to.eq(30);

      expect(unstandardizeAsset721_1).to.eq(AssetERC721.amount);
      expect(unstandardizeAsset721_2).to.eq(AssetERC721.amount);
      expect(unstandardizeAsset1155_1).to.eq(AssetERC1155.amount);
      expect(unstandardizeAsset1155_2).to.eq(AssetERC1155.amount);
    });
  });
  describe('Else/if', () => {
    it('Only owner', async () => {
      const { dotcManager, acc1 } = await loadFixture(fixture);

      const errorMsg = 'OwnableUnauthorizedAccount';

      const acc1Call = dotcManager.connect(acc1);

      await expect(acc1Call.changeEscrowAddress(acc1.address)).to.be.revertedWithCustomError(dotcManager, errorMsg);
      await expect(acc1Call.changeDotcAddress(acc1.address)).to.be.revertedWithCustomError(dotcManager, errorMsg);
      await expect(acc1Call.changeFeeReceiver(acc1.address)).to.be.revertedWithCustomError(dotcManager, errorMsg);
      await expect(acc1Call.changeFeeAmount(1)).to.be.revertedWithCustomError(dotcManager, errorMsg);
      await expect(acc1Call.changeManagerInContracts(acc1.address)).to.be.revertedWithCustomError(dotcManager, errorMsg);
    });

    it('If escrow/dotc returns false', async () => {
      const { dotcManager, escrow, dotcFalse, dotcTrue } = await loadFixture(fixture);

      await dotcManager.changeDotcAddress(dotcFalse.address);
      await expect(dotcManager.changeManagerInContracts(dotcManager.address)).to.be.revertedWithCustomError(dotcManager, 'ChangeDotcManagerError');

      await dotcManager.changeDotcAddress(dotcTrue.address);

      await dotcManager.changeEscrowAddress(escrow.address);
      await expect(dotcManager.changeManagerInContracts(dotcManager.address)).to.be.revertedWithCustomError(dotcManager, 'ChangeEscrowManagerError');
    });

    it('Zero address check', async () => {
      const { dotcManager, erc20 } = await loadFixture(fixture);

      const zeroAddress = ethers.constants.AddressZero;

      const errorMsg = 'ZeroAddressPassed';

      const AssetERC20: AssetStruct = {
        assetType: 1,
        assetAddress: erc20.address,
        amount: BigNumber.from('50000000000000000000000000000'),
        tokenId: 0,
      };

      await expect(dotcManager.changeEscrowAddress(zeroAddress)).to.be.revertedWithCustomError(dotcManager, errorMsg);
      await expect(dotcManager.changeDotcAddress(zeroAddress)).to.be.revertedWithCustomError(dotcManager, errorMsg);
      await expect(dotcManager.changeFeeReceiver(zeroAddress)).to.be.revertedWithCustomError(dotcManager, errorMsg);
      await expect(dotcManager.changeManagerInContracts(zeroAddress)).to.be.revertedWithCustomError(dotcManager, errorMsg);
      await expect(dotcManager.checkAssetOwner(AssetERC20, zeroAddress, AssetERC20.amount)).to.be.revertedWithCustomError(dotcManager, errorMsg);
      await expect(dotcManager['standardizeNumber(uint256,address)'](10, zeroAddress)).to.be.revertedWithCustomError(dotcManager, errorMsg);
      await expect(dotcManager['unstandardizeNumber(uint256,address)'](10, zeroAddress)).to.be.revertedWithCustomError(dotcManager, errorMsg);
      await expect(
        dotcManager['standardizeAsset((uint8,address,uint256,uint256),address)'](AssetERC20, zeroAddress),
      ).to.be.revertedWithCustomError(dotcManager, errorMsg);
    });

    it('Zero amount check', async () => {
      const { dotcManager, acc1 } = await loadFixture(fixture);

      const errorMsg = 'ZeroAmountPassed';

      await expect(dotcManager.changeFeeAmount(0)).to.be.revertedWithCustomError(dotcManager, errorMsg);
      await expect(dotcManager['standardizeNumber(uint256,address)'](0, acc1.address)).to.be.revertedWithCustomError(dotcManager, errorMsg);
      await expect(dotcManager['standardizeNumber(uint256,address)'](0, acc1.address)).to.be.revertedWithCustomError(dotcManager, errorMsg);
      await expect(dotcManager['standardizeNumber(uint256,uint8)'](0, 1)).to.be.revertedWithCustomError(dotcManager, errorMsg);
      await expect(dotcManager['standardizeNumber(uint256,uint8)'](0, 1)).to.be.revertedWithCustomError(dotcManager, errorMsg);
      await expect(dotcManager['standardizeNumber(uint256,uint8)'](1, 0)).to.be.revertedWithCustomError(dotcManager, errorMsg);
      await expect(dotcManager['unstandardizeNumber(uint256,uint8)'](1, 0)).to.be.revertedWithCustomError(dotcManager, errorMsg);
      await expect(dotcManager['unstandardizeNumber(uint256,uint8)'](0, 1)).to.be.revertedWithCustomError(dotcManager, errorMsg);
      await expect(dotcManager['unstandardizeNumber(uint256,uint8)'](0, 1)).to.be.revertedWithCustomError(dotcManager, errorMsg);
      await expect(dotcManager['unstandardizeNumber(uint256,uint8)'](1, 0)).to.be.revertedWithCustomError(dotcManager, errorMsg);
      await expect(dotcManager['unstandardizeNumber(uint256,uint8)'](1, 0)).to.be.revertedWithCustomError(dotcManager, errorMsg);
      await expect(dotcManager['unstandardizeNumber(uint256,address)'](0, acc1.address)).to.be.revertedWithCustomError(dotcManager, errorMsg);
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
