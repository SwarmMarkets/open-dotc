/* eslint-disable */
import '@openzeppelin/hardhat-upgrades';
import '@nomicfoundation/hardhat-toolbox';
import 'solidity-docgen';
import dotenv from 'dotenv';
import type { HardhatUserConfig } from 'hardhat/config';
import { getNetworkConfig } from './utils/getNetworkConfig';
import { etherscanConfig as etherscan } from './utils/blockscanConfig';

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      { version: '0.8.28', settings: { optimizer: { enabled: true, runs: 200 } } },
      { version: '0.8.24', settings: { optimizer: { enabled: true, runs: 200 } } },
      { version: '0.8.19', settings: { optimizer: { enabled: true, runs: 200 } } },
    ],
  },
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      throwOnCallFailures: false,
      chainId: 31337,
      initialBaseFeePerGas: 0,
      accounts: { accountsBalance: '10000000000000000000000000' },
      forking: {
        url: getNetworkConfig('mainnet').url!,
        enabled: false,
      },
    },
    mainnet: getNetworkConfig('mainnet'),
    optimism: getNetworkConfig('optimism'),
    bsc: getNetworkConfig('bsc'),
    gnosis: getNetworkConfig('gnosis'),
    unichain: getNetworkConfig('unichain'),
    polygon: getNetworkConfig('polygon'),
    sonic: getNetworkConfig('sonic'),
    hedera: getNetworkConfig('hedera'),
    // hederaMainnet: {
    //   url: 'http://127.0.0.1:7546',
    //   chainId: 295,
    //   accounts: [process.env.HEDERA_PK!],
    // },
    polygonZk: getNetworkConfig('polygonZk'),
    base: getNetworkConfig('base'),
    mode: getNetworkConfig('mode'),
    arbitrum: getNetworkConfig('arbitrum'),
    celo: getNetworkConfig('celo'),
    snowtrace: getNetworkConfig('snowtrace'),
    linea: getNetworkConfig('linea'),
    blast: getNetworkConfig('blast'),
    hyperevm: getNetworkConfig('hyperevm'),
    plume: getNetworkConfig('plume'),
    scroll: getNetworkConfig('scroll'),
    amoy: getNetworkConfig('amoy'),
    base_sepolia: getNetworkConfig('base_sepolia'),
    arbitrum_sepolia: getNetworkConfig('arbitrum_sepolia'),
    sepolia: getNetworkConfig('sepolia'),
  },
  gasReporter: {
    coinmarketcap: process.env.COIN_MARKET_CAP_KEY,
    currency: 'USD',
    enabled: process.env.REPORT_GAS ? true : false,
    excludeContracts: ['mocks/', 'test/'],
  },
  etherscan,
  docgen: {
    outputDir: './docs/TechnicalRequirements',
    exclude: ['mocks', 'OpenDotc/v1'],
    pages: 'files',
  },
  paths: {
    artifacts: './artifacts',
    cache: './cache',
    sources: './contracts',
    tests: './test',
  },
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v5',
  },
};

export default config;
