import { ethers, upgrades } from 'hardhat';
import { DotcManagerV2 as DotcManager, DotcV2 as Dotc, DotcEscrowV2 as DotcEscrow } from '../../typechain';
import { ContractFactory } from 'ethers';

const UPGRADE_DOTC_MANAGER = true;
const UPGRADE_DOTC = true;
const UPGRADE_ESCROW = true;

//Polygon
// const CURRENT_DOTC_MANAGER_ADDRESS: string = '0xF8981283ac9691B7783a9086277665A962fC13f3';
// const CURRENT_DOTC_ADDRESS: string = '0x56CbAf03dBfBF4c73CDC7a63B523c895bbb4869F';
// const CURRENT_ESCROW_ADDRESS: string = '0x4bAF3fAF58ccf73C7Ca8a5391B596797c3Ea3E2E';

//Mainnet
const CURRENT_DOTC_MANAGER_ADDRESS: string = '0xF8981283ac9691B7783a9086277665A962fC13f3';
const CURRENT_DOTC_ADDRESS: string = '0x632F2fe528D59ae71eCd38d7F1fDf8D5b5B1CF25';
const CURRENT_ESCROW_ADDRESS: string = '0xB8ADaD01342D656D8f70Fe1fa55cc3FBb6965f7d';

async function main() {
  if (UPGRADE_DOTC_MANAGER) {
    const DotcManager: ContractFactory = await ethers.getContractFactory('DotcManagerV2');
    const dotcManager = (await upgrades.upgradeProxy(CURRENT_DOTC_MANAGER_ADDRESS, DotcManager)) as DotcManager;
    await dotcManager.deployed();

    console.log('DotcManager: ', dotcManager.address);
  }

  if (UPGRADE_DOTC) {
    const Dotc = await ethers.getContractFactory('DotcV2');
    const dotc = (await upgrades.upgradeProxy(CURRENT_DOTC_ADDRESS, Dotc)) as Dotc;
    await dotc.deployed();

    console.log('Dotc: ', dotc.address);
  }

  if (UPGRADE_ESCROW) {
    const DotcEscrow = await ethers.getContractFactory('DotcEscrowV2');
    const dotcEscrow = (await upgrades.upgradeProxy(CURRENT_ESCROW_ADDRESS, DotcEscrow)) as DotcEscrow;
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
