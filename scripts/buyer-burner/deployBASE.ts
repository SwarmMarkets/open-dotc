import { ethers, upgrades } from 'hardhat';
import { BuyerBurnerCCIPCaller, BuyerBurnerSwapper, SwarmBuyerBurner } from '../../typechain';
import { ContractFactory } from 'ethers';

enum DEXType {
  NoType,
  UniswapV3,
  PancakeswapV3,
}

const SMT_ADDRESS = '0x2974dC646e375e83bd1c0342625b49f288987fA4';
const SMT_PRICE_FEED = '0xd1943f7f20ef9923BBB341eCCc702B31de869f33';
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
const ETH_PRICE_FEED = '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const USDC_PRICE_FEED = '0x7e860098F58bBFC8648a4311b374B1D669a2bc6B';

const SMT_WHALE_ADDRESS = '0xf5419608AaaD7d3d8CBB11E21a7286eE8567C907';
const WETH_WHALE_ADDRESS = '0xecbf6e57d9430b8F79927e6109183846fab55D25';
const USDC_WHALE_ADDRESS = '0x0B0A5886664376F59C351ba3f598C8A8B4D0A6f3';

const DOTC = '0xcfFD07806F6A8fc623d6d61ddC3532BF1D2eB8b9';
const UNISWAP_FACTORY_ADDRESS = '0x33128a8fC17869897dcE68Ed026d694621f6FDfD';
const UNISWAP_ROUTER_ADDRESS = '0x2626664c2603336E57B271c5C0b26F421741e481';
const UNISWAP_QUOTER_ADDRESS = '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a';

const PANCAKESWAP_FACTORY_ADDRESS = '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865';
const PANCAKESWAP_ROUTER_ADDRESS = '0x1b81D678ffb9C0263b24A97847620C99d213eB14';
const PANCAKESWAP_QUOTER_ADDRESS = '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997';

const DESTINATION_CHAIN_SELECTOR = '5009297550715157269';
const CCIP_BRIDGE = '0xC9e89cA8B5e67896f10268595a8a976eA4a69f29';

const uniswapConfig: BuyerBurnerSwapper.DexConfigStruct = {
  dexType: DEXType.UniswapV3,
  poolFees: {
    tier1: 100,
    tier2: 500,
    tier3: 3000,
    tier4: 10000,
  },
  intermediateToken: WETH_ADDRESS,
  finalToken: { token: USDC_ADDRESS, priceFeed: USDC_PRICE_FEED },
  swapV3Router: UNISWAP_ROUTER_ADDRESS,
  swapV3Quoter: UNISWAP_QUOTER_ADDRESS,
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
  intermediateToken: WETH_ADDRESS,
  finalToken: { token: USDC_ADDRESS, priceFeed: USDC_PRICE_FEED },
  swapV3Router: PANCAKESWAP_ROUTER_ADDRESS,
  swapV3Quoter: PANCAKESWAP_QUOTER_ADDRESS,
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
        { token: WETH_ADDRESS, priceFeed: ETH_PRICE_FEED },
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
