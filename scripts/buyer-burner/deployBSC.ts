import { ethers, upgrades } from 'hardhat';
import { BuyerBurnerCCIPCaller, BuyerBurnerSwapper, SwarmBuyerBurner } from '../../typechain';
import { ContractFactory } from 'ethers';

const USD1_ADDRESS = '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d';
const USD1_PRICE_FEED = '0xaD8b4e59A7f25B68945fAf0f3a3EAF027832FFB0';
const CAKE_ADDRESS = '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82';
const CAKE_PRICE_FEED = '0xB6064eD41d4f67e353768aA239cA86f4F73665a1';
const WBNB_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const BNB_PRICE_FEED = '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE';

const DOTC = '0x17Fe797082FA229789c9197FE10fD205540cAbDD';
const UNISWAP_FACTORY_ADDRESS = '0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7';
const UNISWAP_ROUTER_ADDRESS = '0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2';
const UNISWAP_QUOTER_ADDRESS = '0x78D78E420Da98ad378D7799bE8f4AF69033EB077';

const PANCAKESWAP_FACTORY_ADDRESS = '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865';
const PANCAKESWAP_ROUTER_ADDRESS = '0x1b81D678ffb9C0263b24A97847620C99d213eB14';
const PANCAKESWAP_QUOTER_ADDRESS = '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997';

const DESTINATION_CHAIN_SELECTOR = '5009297550715157269';
const CCIP_BRIDGE = '0x2B418D9B1e0C203Ab93c8b5A54258Bb3E6BAbbc6';

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
  intermediateToken: WBNB_ADDRESS,
  finalToken: { token: USD1_ADDRESS, priceFeed: USD1_PRICE_FEED },
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
  intermediateToken: WBNB_ADDRESS,
  finalToken: { token: USD1_ADDRESS, priceFeed: USD1_PRICE_FEED },
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
        { token: CAKE_ADDRESS, priceFeed: CAKE_PRICE_FEED },
        { token: WBNB_ADDRESS, priceFeed: BNB_PRICE_FEED },
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
