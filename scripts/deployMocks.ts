import { ethers } from 'hardhat';
import { ContractFactory } from 'ethers';

let dotcManager_address: string, dotc_address: string;

async function main() {
  const AuthorizationMock: ContractFactory = await ethers.getContractFactory('AuthorizationMock');
  const auth = await AuthorizationMock.deploy(true);
  await auth.deployed();
  console.log('Auth: ', auth.address);

  const PriceFeed1: ContractFactory = await ethers.getContractFactory('PriceFeedV1Mock');
  const pricefeed1 = await PriceFeed1.deploy(99999257);
  await pricefeed1.deployed();
  console.log('PriceFeed1: ', pricefeed1.address);

  const PriceFeed2: ContractFactory = await ethers.getContractFactory('PriceFeedV3Mock');
  const pricefeed2 = await PriceFeed2.deploy(236069005000);
  await pricefeed2.deployed();
  console.log('PriceFeed2: ', pricefeed1.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
