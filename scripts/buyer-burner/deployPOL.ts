import { ethers, upgrades } from 'hardhat';
import { BuyerBurnerCCIPCaller, BuyerBurnerSwapper, SwarmBuyerBurner } from '../../typechain';
import { ContractFactory } from 'ethers';

const SMT_ADDRESS = '0xE631DABeF60c37a37d70d3B4f812871df663226f';
const SMT_PRICE_FEED = '0x0c2ed226c5AC01C01ebc8F6D74Dcd665fC6d6C71';
const USDCe_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const USDC_PRICE_FEED = '0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7';

const DOTC = '0x22593B8749a4e4854C449c30054bb4d896374fa1';
const UNISWAP_FACTORY_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
const UNISWAP_ROUTER_ADDRESS = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45';
const UNISWAP_QUOTER_ADDRESS = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e';

const PANCAKESWAP_FACTORY_ADDRESS = '0x917933899c6a5F8E37F31E19f92CdBFF7e8FF0e2';
const PANCAKESWAP_ROUTER_ADDRESS = '0x3Ced11c610556e5292fBC2e75D68c3899098C14C';
const PANCAKESWAP_QUOTER_ADDRESS = '0xb1E835Dc2785b52265711e17fCCb0fd018226a6e';

const DESTINATION_CHAIN_SELECTOR = '5009297550715157269';
const CCIP_BRIDGE = '0x231710Ab6999E3468eBbfF6B9dC467a559f7a2d6';

enum DEXType {
  NoType,
  UniswapV3,
  PancakeswapV3,
}

const uniswapConfig: BuyerBurnerSwapper.DexConfigStruct = {
  dexType: DEXType.UniswapV3,
  poolFees: {
    tier1: 100,
    tier2: 500,
    tier3: 3000,
    tier4: 10000,
  },
  intermediateToken: USDCe_ADDRESS,
  finalToken: { token: USDC_ADDRESS, priceFeed: USDC_PRICE_FEED },
  swapV3Router: UNISWAP_ROUTER_ADDRESS,
  swapV3Factory: UNISWAP_FACTORY_ADDRESS,
};

const pancakeswapConfig: BuyerBurnerSwapper.DexConfigStruct = {
  dexType: DEXType.PancakeswapV3,
  poolFees: {
    tier1: 100,
    tier2: 500,
    tier3: 2500,
    tier4: 10000,
  },
  intermediateToken: USDCe_ADDRESS,
  finalToken: { token: USDC_ADDRESS, priceFeed: USDC_PRICE_FEED },
  swapV3Router: PANCAKESWAP_ROUTER_ADDRESS,
  swapV3Factory: PANCAKESWAP_FACTORY_ADDRESS,
};

async function main() {
  const ccipConfig: BuyerBurnerCCIPCaller.CCIPConfigStruct = {
    destinationChainSelector: DESTINATION_CHAIN_SELECTOR,
    bridge: CCIP_BRIDGE,
    receiver: '0x54111D52864558A3CF7ec70C6b8da358d3Fda258',
  };

  const SwarmBuyerBurner: ContractFactory = await ethers.getContractFactory('ChildSwarmBuyerBurner');
  const buyerBurner: SwarmBuyerBurner = (await upgrades.deployProxy(
    SwarmBuyerBurner,
    [
      DOTC,
      ccipConfig,
      [uniswapConfig, pancakeswapConfig],
      [
        { token: SMT_ADDRESS, priceFeed: SMT_PRICE_FEED },
        { token: USDCe_ADDRESS, priceFeed: USDC_PRICE_FEED },
      ],
    ],
    {
      unsafeAllow: ['constructor'],
      unsafeAllowLinkedLibraries: true,
    },
  )) as SwarmBuyerBurner;
  await buyerBurner.deployed();

  console.log('Buyer/burner: ', buyerBurner.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
