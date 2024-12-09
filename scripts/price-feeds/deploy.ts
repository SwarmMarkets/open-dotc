import { ethers } from 'hardhat';
import { ContractFactory } from 'ethers';

const price_feed: string = '';

async function main() {
  const GoldKiloPriceFeed: ContractFactory = await ethers.getContractFactory('GoldKiloPriceFeed');
  const pf = await GoldKiloPriceFeed.deploy(price_feed);
  await pf.deployed();
  console.log('PriceFeed: ', pf.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
