import hre, { ethers } from 'hardhat';
import { verifyContract } from '../helpers/verify-contract';
import { getBlockscanConfig } from '../../utils/blockscanConfig';

const BUYER_BURNER_ADDRESS = '0xBaa1d51e510DB8564D906A0A3643933711007a34';
const SMT_ADDRESS = '0x2974dC646e375e83bd1c0342625b49f288987fA4';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const USDT_ADDRESS = '0xfde4c96c8593536e31f229ea8f37b2ada2699bb2';
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
const WBTC_ADDRESS = '0xd07379a755a8f11b57610154861d694b2a0f615a';
const UNISWAP_FACTORY_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
const UNISWAP_ROUTER_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
const UNISWAP_QUOTER_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6';

async function main(): Promise<void> {
  console.log(ethers.provider);

  await verifyContract(BUYER_BURNER_ADDRESS, [
    WETH_ADDRESS,
    SMT_ADDRESS,
    [USDC_ADDRESS, USDT_ADDRESS, WETH_ADDRESS, WBTC_ADDRESS],
    UNISWAP_FACTORY_ADDRESS,
    UNISWAP_ROUTER_ADDRESS,
    UNISWAP_QUOTER_ADDRESS,
  ]);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
