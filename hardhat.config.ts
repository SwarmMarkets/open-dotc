/* eslint-disable */
import '@openzeppelin/hardhat-upgrades';
import '@nomicfoundation/hardhat-toolbox';
import 'solidity-docgen';
import 'hardhat-contract-sizer';
import './tasks/accounts';
import './tasks/clean';
import dotenv from 'dotenv';
import { HardhatUserConfig } from 'hardhat/config';
dotenv.config();

// Ensure that we have all the environment variables we need.
const mnemonic = process.env.MNEMONIC ?? '';
const swarmx_privateKey = process.env.SWARMX_DEPLOYER_PK ?? '';
const testnet_privateKey = process.env.TESTNET_DEPLOYER_PK ?? '';

const etherscanKey = process.env.ETHSCAN_KEY ?? '';
const polyscanKey = process.env.POLYSCAN_KEY ?? '';
const basescanKey = process.env.BASESCAN_KEY ?? '';

const infuraKey = process.env.INFURA_KEY ?? '';
export const ethApiKey = process.env.ALCHEMY_KEY_ETH ?? infuraKey;
const sepoliaApiKey = process.env.ALCHEMY_KEY_SEPOLIA ?? infuraKey;
const polygonApiKey = process.env.ALCHEMY_KEY_POLYGON ?? infuraKey;
const mumbaiApiKey = process.env.ALCHEMY_KEY_MUMBAI ?? infuraKey;
const baseApiKey = process.env.ALCHEMY_KEY_BASE ?? infuraKey;
const base_sepoliaApiKey = process.env.ALCHEMY_KEY_BASE_SEPOLIA ?? infuraKey;

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.19',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.7.5',
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
      blockGasLimit: 20000000,
      throwOnCallFailures: false,
      chainId: 31337,
      initialBaseFeePerGas: 0,
      accounts: {
        mnemonic,
        accountsBalance: '10000000000000000000000000',
      },
      forking: {
        url: `https://eth-mainnet.alchemyapi.io/v2/${ethApiKey}`,
        enabled: false,
        //blockNumber: 16383055,
      },
    },
    mainnet: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${ethApiKey}`,
      chainId: 1,
      accounts: [swarmx_privateKey],
      gas: 2100000,
      gasPrice: 45000000000, // 45
    },
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${sepoliaApiKey}`,
      chainId: 11155111,
      accounts: [testnet_privateKey],
      gas: 2100000,
      gasPrice: 45000000000, // 45
    },
    polygon: {
      url: `https://polygon-mainnet.g.alchemy.com/v2/${polygonApiKey}`,
      chainId: 137,
      accounts: { mnemonic },
      gas: 5000000,
      gasPrice: 250000000000, // 250
    },
    mumbai: {
      url: `https://polygon-mumbai.g.alchemy.com/v2/${mumbaiApiKey}`,
      chainId: 80001,
      accounts: [testnet_privateKey],
      gas: 2100000,
      gasPrice: 45000000000, // 45
      gasMultiplier: 2,
    },
    base: {
      url: `https://base-mainnet.g.alchemy.com/v2/${baseApiKey}`,
      chainId: 8453,
      accounts: [swarmx_privateKey],
    },
    base_sepolia: {
      url: `https://base-sepolia.g.alchemy.com/v2/${base_sepoliaApiKey}`,
      chainId: 84532,
      accounts: [testnet_privateKey],
      gasPrice: 30000000000, // 45
    },
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
      base: basescanKey,
      base_sepolia: basescanKey,
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
    ],
  },
  docgen: {
    // path: './docs',
    // clear: true,
    // runOnCompile: true,
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
