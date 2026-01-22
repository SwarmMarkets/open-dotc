import { ethers, upgrades } from 'hardhat';
import { ChildSwarmBuyerBurner } from '../../typechain';
import { ContractFactory } from 'ethers';

const current_buyer_burner = '0x2D72B1959a0aaEE01Cf9afDB9Cb93B0FA05756aC';

async function main() {
  const ChildSwarmBuyerBurner: ContractFactory = await ethers.getContractFactory('ChildSwarmBuyerBurner');
  const swarmBuyerBurner = (await upgrades.upgradeProxy(current_buyer_burner, ChildSwarmBuyerBurner, {
    unsafeAllow: ['constructor'],
    unsafeAllowLinkedLibraries: true,
  })) as ChildSwarmBuyerBurner;
  await swarmBuyerBurner.deployed();

  console.log('SwarmBuyerBurner: ', swarmBuyerBurner.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
