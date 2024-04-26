import { ethers, upgrades } from 'hardhat';
import { DotcManager, Dotc, DotcEscrow } from '../../typechain';
import { ContractFactory } from 'ethers';

const DEPLOY_DOTC_MANAGER = true;
const DEPLOY_DOTC = true;
const DEPLOY_ESCROW = true;

let dotcManager_address: string, dotc_address: string;

async function main() {
  const [deployer] = await ethers.getSigners();

  if (DEPLOY_DOTC_MANAGER) {
    const DotcManager: ContractFactory = await ethers.getContractFactory('DotcManager');

    const dotcManager = (await upgrades.deployProxy(DotcManager, [deployer.address])) as DotcManager;
    await dotcManager.deployed();

    dotcManager_address = dotcManager.address;

    console.log('DotcManager: ', dotcManager.address);
  }

  if (DEPLOY_DOTC) {
    if (dotcManager_address == undefined || dotcManager_address == '') {
      throw Error('Dotc manager address not set');
    }

    const Dotc = await ethers.getContractFactory('DotcV2');
    const dotc = (await upgrades.deployProxy(Dotc, [dotcManager_address])) as Dotc;
    await dotc.deployed();
    dotc_address = dotc.address;

    console.log('Dotc: ', dotc.address);
  }

  if (DEPLOY_ESCROW) {
    if (dotcManager_address == undefined || dotcManager_address == '') {
      throw Error('Dotc manager address not set');
    }

    const DotcEscrow = await ethers.getContractFactory('DotcEscrow');
    const dotcEscrow = (await upgrades.deployProxy(DotcEscrow, [dotcManager_address])) as DotcEscrow;
    await dotcEscrow.deployed();

    console.log('DotcEscrow: ', dotcEscrow.address);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
