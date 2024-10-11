import { ethers, upgrades } from 'hardhat';
import { DotcManagerV2, DotcV2, DotcEscrowV2 } from '../../typechain';
import { ContractFactory } from 'ethers';

const UPGRADE_DOTC_MANAGER = true;
const UPGRADE_DOTC = true;
const UPGRADE_ESCROW = true;

const dotcManager_address: string = '',
  dotc_address: string = '',
  escrow_address: string = '';

async function main() {
  if (UPGRADE_DOTC_MANAGER) {
    const DotcManager: ContractFactory = await ethers.getContractFactory('DotcManagerV2');
    const dotcManager = (await upgrades.upgradeProxy(dotcManager_address, DotcManager)) as DotcManagerV2;
    await dotcManager.deployed();

    console.log('DotcManager: ', dotcManager.address);
  }

  if (UPGRADE_DOTC) {
    const Dotc = await ethers.getContractFactory('DotcV2');
    const dotc = (await upgrades.upgradeProxy(dotc_address, Dotc)) as DotcV2;
    await dotc.deployed();

    console.log('Dotc: ', dotc.address);
  }

  if (UPGRADE_ESCROW) {
    const DotcEscrow = await ethers.getContractFactory('DotcEscrowV2');
    const dotcEscrow = (await upgrades.upgradeProxy(escrow_address, DotcEscrow)) as DotcEscrowV2;
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
