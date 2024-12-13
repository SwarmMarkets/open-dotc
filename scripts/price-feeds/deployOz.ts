import { ethers } from 'hardhat';
import { ContractFactory } from 'ethers';

async function main() {
  const GoldOuncePriceFeed: ContractFactory = await ethers.getContractFactory('GoldOuncePriceFeed');
  const pf = await GoldOuncePriceFeed.deploy(8, 'XAU Ounce / USD', 1);
  await pf.deployed();
  console.log('PriceFeed: ', pf.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
