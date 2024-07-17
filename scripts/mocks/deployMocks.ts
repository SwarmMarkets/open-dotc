import { ethers } from 'hardhat';
import { ContractFactory } from 'ethers';

let dotcManager_address: string, dotc_address: string;

async function main() {
  const AuthorizationMock: ContractFactory = await ethers.getContractFactory('AuthorizationMock');
  const authTrue = await AuthorizationMock.deploy(true);
  await authTrue.deployed();
  console.log('Auth TRUE: ', authTrue.address);
  const authFalse = await AuthorizationMock.deploy(false);
  await authFalse.deployed();
  console.log('Auth FALSE: ', authFalse.address);

  const PriceFeed_USDC: ContractFactory = await ethers.getContractFactory('PriceFeedV1Mock');
  const priceFeed_USDC = await PriceFeed_USDC.deploy(99999257);
  await priceFeed_USDC.deployed();
  console.log('PriceFeed_USDC: ', priceFeed_USDC.address);

  const PriceFeedV3Mock: ContractFactory = await ethers.getContractFactory('PriceFeedV3Mock');
  const priceFeed_ETH = await PriceFeedV3Mock.deploy(304097411980);
  await priceFeed_ETH.deployed();
  const priceFeed_Gold = await PriceFeedV3Mock.deploy(236069005000);
  await priceFeed_Gold.deployed();
  console.log('PriceFeed_ETH: ', priceFeed_ETH.address);
  console.log('PriceFeed_Gold: ', priceFeed_Gold.address);

  const ERC20Mock: ContractFactory = await ethers.getContractFactory('ERC20MockV2');
  const erc20_6 = await ERC20Mock.deploy(6);
  await erc20_6.deployed();
  const erc20_18 = await ERC20Mock.deploy(18);
  await erc20_18.deployed();

  console.log('ERC20_6: ', erc20_6.address);
  console.log('ERC20_18: ', erc20_18.address);

  const ERC721: ContractFactory = await ethers.getContractFactory('ERC721MockV2');
  const erc721 = await ERC721.deploy();
  await erc721.deployed();
  console.log('ERC721: ', erc721.address);

  const ERC1155MockV2: ContractFactory = await ethers.getContractFactory('ERC1155MockV2');
  const erc1155 = await ERC1155MockV2.deploy();
  await erc1155.deployed();
  console.log('ERC1155: ', erc1155.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
