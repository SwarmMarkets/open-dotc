import { ethers } from 'hardhat';
import { ContractFactory } from 'ethers';

const price_feed: string = '0x86896fEB19D8A607c3b11f2aF50A0f239Bd71CD0';

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
