/* eslint-disable */
import '@openzeppelin/hardhat-upgrades';
import '@nomicfoundation/hardhat-toolbox';
import 'solidity-docgen';
import 'hardhat-contract-sizer';
import dotenv from 'dotenv';
import { HardhatUserConfig } from 'hardhat/config';
import { getNetworkConfig, AccountTypes } from './utils/get-network-account';
dotenv.config();

const etherscanKey = process.env.ETHSCAN_KEY ?? '';
const polyscanKey = process.env.POLYSCAN_KEY ?? '';
const basescanKey = process.env.BASESCAN_KEY ?? '';
const opscanKey = process.env.OPSCAN_KEY ?? '';
const arbitrumscanKey = process.env.ARBSCAN_KEY ?? '';

export const ethApiKey = process.env.ALCHEMY_KEY_ETH;

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.28',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.8.25',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.8.19',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      throwOnCallFailures: false,
      chainId: 31337,
      initialBaseFeePerGas: 0,
      accounts: {
        accountsBalance: '10000000000000000000000000',
      },
      forking: {
        url: getNetworkConfig('polygon', AccountTypes.SwarmMnemonic).url!,
        enabled: false,
        blockNumber: 57833958,
      },
    },
    mainnet: getNetworkConfig('mainnet', AccountTypes.SwarmXMnemonic),
    polygon: getNetworkConfig('polygon', AccountTypes.SwarmXMnemonic),
    optimism: getNetworkConfig('optimism', AccountTypes.SwarmXMnemonic),
    base: getNetworkConfig('base', AccountTypes.SwarmXMnemonic),
    arbitrum: getNetworkConfig('arbitrum', AccountTypes.SwarmXMnemonic),
    arbitrum_sepolia: getNetworkConfig('arbitrum_sepolia', AccountTypes.TestnetPk),
    sepolia: getNetworkConfig('sepolia', AccountTypes.TestnetPk),
    mumbai: getNetworkConfig('mumbai', AccountTypes.TestnetPk),
    base_sepolia: getNetworkConfig('base_sepolia', AccountTypes.TestnetPk),
  },
  gasReporter: {
    coinmarketcap: process.env.COIN_MARKET_CAP_KEY,
    currency: 'USD',
    enabled: process.env.REPORT_GAS ? true : false,
    excludeContracts: ['mocks/', 'test/'],
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: false,
    disambiguatePaths: false,
  },
  etherscan: {
    apiKey: {
      mainnet: etherscanKey,
      polygon: polyscanKey,
      optimisticEthereum: opscanKey,
      base: basescanKey,
      arbitrumOne: arbitrumscanKey,
      base_sepolia: basescanKey,
      sepolia: etherscanKey,
      arbitrum_sepolia: arbitrumscanKey,
    },
    customChains: [
      {
        network: 'base',
        chainId: 8453,
        urls: {
          apiURL: 'https://api.basescan.org/api',
          browserURL: 'https://basescan.org/',
        },
      },
      {
        network: 'base_sepolia',
        chainId: 84532,
        urls: {
          apiURL: 'https://api-sepolia.basescan.org/api',
          browserURL: 'https://sepolia.basescan.org',
        },
      },
      {
        network: 'arbitrum_sepolia',
        chainId: 421614,
        urls: {
          apiURL: 'https://api-sepolia.arbiscan.io/api',
          browserURL: 'https://sepolia.arbiscan.io',
        },
      },
    ],
  },
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
