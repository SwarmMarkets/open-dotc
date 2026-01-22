import { ethers, upgrades } from 'hardhat';
import { SwarmBuyerBurner } from '../../typechain';
import { ContractFactory } from 'ethers';

const current_buyer_burner = '0xCa229967CD6aa6F15936C18ADe845cf90a23CC67';

async function main() {
  const SwarmBuyerBurner: ContractFactory = await ethers.getContractFactory('SwarmBuyerBurner');
  const swarmBuyerBurner = (await upgrades.upgradeProxy(current_buyer_burner, SwarmBuyerBurner, {
    unsafeAllow: ['constructor'],
    unsafeAllowLinkedLibraries: true,
  })) as SwarmBuyerBurner;
  await swarmBuyerBurner.deployed();

  console.log('SwarmBuyerBurner: ', swarmBuyerBurner.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
