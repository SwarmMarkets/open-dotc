import { ethers, upgrades } from 'hardhat';
import { DotcManagerV2, DotcV2, DotcEscrowV2, AssetHelper, OfferHelper, DotcOfferHelper } from '../../typechain';
import { ContractFactory } from 'ethers';

const DEPLOY_LIBRARIES = true;
const DEPLOY_DOTC_MANAGER = true;
const DEPLOY_DOTC = true;
const DEPLOY_ESCROW = true;

let dotcManager_address: string,
  dotc_address: string,
  escrow_address: string;

let assetHelper_address: string,
  offerHelper_address: string,
  dotcOfferHelper_address: string;

async function main() {
  const [deployer] = await ethers.getSigners();

  if (DEPLOY_LIBRARIES) {
    // Deploy AssetHelper library
    const AssetHelper: ContractFactory = await ethers.getContractFactory('AssetHelper');
    const assetHelper = await AssetHelper.deploy() as AssetHelper;
    await assetHelper.deployed();
    assetHelper_address = assetHelper.address;

    console.log("AssetHelper: ", assetHelper.address);

    // Deploy DotcOfferHelper library
    const OfferHelper: ContractFactory = await ethers.getContractFactory('OfferHelper', {
      libraries: {
        AssetHelper: assetHelper.address,
      },
    });
    const offerHelper = await OfferHelper.deploy() as OfferHelper;
    await offerHelper.deployed();
    offerHelper_address = offerHelper.address;

    console.log("OfferHelper: ", offerHelper.address);

    // Deploy DotcOfferHelper library
    const DotcOfferHelper: ContractFactory = await ethers.getContractFactory('DotcOfferHelper');
    const dotcOfferHelper = await DotcOfferHelper.deploy() as DotcOfferHelper;
    await dotcOfferHelper.deployed();
    dotcOfferHelper_address = dotcOfferHelper.address;

    console.log("DotcOfferHelper: ", dotcOfferHelper.address);

  }

  if (DEPLOY_DOTC_MANAGER) {
    const DotcManagerV2: ContractFactory = await ethers.getContractFactory('DotcManagerV2');

    const dotcManager = (await upgrades.deployProxy(DotcManagerV2, [deployer.address])) as DotcManagerV2;
    await dotcManager.deployed();

    dotcManager_address = dotcManager.address;

    console.log('DotcManager: ', dotcManager.address);
  }

  if (DEPLOY_DOTC) {
    if (dotcManager_address == undefined || dotcManager_address == '') {
      throw Error('Dotc manager address not set');
    }
    if (assetHelper_address == undefined || assetHelper_address == '') {
      throw Error('Asset helper address not set');
    }
    if (offerHelper_address == undefined || offerHelper_address == '') {
      throw Error('Offer helper address not set');
    }
    if (dotcOfferHelper_address == undefined || dotcOfferHelper_address == '') {
      throw Error('Dotc Offer helper address not set');
    }

    const Dotc = await ethers.getContractFactory('DotcV2', {
      libraries: {
        AssetHelper: assetHelper_address,
        OfferHelper: offerHelper_address,
        DotcOfferHelper: dotcOfferHelper_address,
      },
    });
    const dotc = (await upgrades.deployProxy(Dotc, [dotcManager_address], { unsafeAllowLinkedLibraries: true })) as DotcV2;
    await dotc.deployed();
    dotc_address = dotc.address;

    console.log('Dotc: ', dotc.address);
  }

  if (DEPLOY_ESCROW) {
    if (dotcManager_address == undefined || dotcManager_address == '') {
      throw Error('Dotc manager address not set');
    }

    const DotcEscrow = await ethers.getContractFactory('DotcEscrowV2');
    const dotcEscrow = (await upgrades.deployProxy(DotcEscrow, [dotcManager_address])) as DotcEscrowV2;
    await dotcEscrow.deployed();
    escrow_address = dotcEscrow.address;

    console.log('DotcEscrow: ', dotcEscrow.address);
  }

  if (dotcManager_address) {
    const dotcManager = await ethers.getContractAt('DotcManagerV2', dotcManager_address) as DotcManagerV2;

    await (await dotcManager.changeEscrow(escrow_address)).wait(1);
    await (await dotcManager.changeDotc(dotc_address)).wait(1);
    await (await dotcManager.changeDotcInEscrow()).wait(1);
    await (await dotcManager.changeEscrowInDotc()).wait(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
