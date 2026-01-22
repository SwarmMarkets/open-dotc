import { ethers, upgrades } from 'hardhat';
import { BuyerBurnerSwapper, SwarmBuyerBurner } from '../../typechain';
import { ContractFactory } from 'ethers';

enum DEXType {
  NoType,
  UniswapV3,
  PancakeswapV3,
}

const SMT_ADDRESS = '0xB17548c7B510427baAc4e267BEa62e800b247173';
const SMT_PRICE_FEED = '0x31C1e5AcBCb206e962939280613Cd812243bE8f5';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDC_PRICE_FEED = '0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6';
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const ETH_PRICE_FEED = '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419';
const WBTC_ADDRESS = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';
const BTC_PRICE_FEED = '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c';

const DOTC = '0x0a103eE32F4209926D8ba7e528AFf8a831Ed3daE';
const UNISWAP_FACTORY_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
const UNISWAP_ROUTER_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
const UNISWAP_QUOTER_ADDRESS = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e';

const PANCAKESWAP_FACTORY_ADDRESS = '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865';
const PANCAKESWAP_ROUTER_ADDRESS = '0x1b81D678ffb9C0263b24A97847620C99d213eB14';
const PANCAKESWAP_QUOTER_ADDRESS = '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997';

const uniswapConfig: BuyerBurnerSwapper.DexConfigStruct = {
  dexType: DEXType.UniswapV3,
  poolFees: {
    tier1: 100,
    tier2: 500,
    tier3: 3000,
    tier4: 10000,
  },
  intermediateToken: WETH_ADDRESS,
  finalToken: { token: SMT_ADDRESS, priceFeed: SMT_PRICE_FEED },
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
  intermediateToken: '0x0000000000000000000000000000000000000000',
  finalToken: { token: SMT_ADDRESS, priceFeed: SMT_PRICE_FEED },
  swapV3Router: PANCAKESWAP_ROUTER_ADDRESS,
  swapV3Factory: PANCAKESWAP_FACTORY_ADDRESS,
};

async function main() {
  const SwarmBuyerBurner: ContractFactory = await ethers.getContractFactory('SwarmBuyerBurner');
  const buyerBurner: SwarmBuyerBurner = (await upgrades.deployProxy(
    SwarmBuyerBurner,
    [
      DOTC,
      [uniswapConfig, pancakeswapConfig],
      [
        { token: USDC_ADDRESS, priceFeed: USDC_PRICE_FEED },
        { token: WETH_ADDRESS, priceFeed: ETH_PRICE_FEED },
        { token: WBTC_ADDRESS, priceFeed: BTC_PRICE_FEED },
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
