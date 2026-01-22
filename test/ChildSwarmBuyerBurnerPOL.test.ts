import hre, { ethers, network, upgrades } from 'hardhat';
import { ContractFactory } from 'ethers';
import { expect } from 'chai';
import {
  ChildSwarmBuyerBurner as SwarmBuyerBurner,
  IERC20Metadata,
  BuyerBurnerSwapper,
  DotcV2,
  BuyerBurnerCCIPCaller,
} from '../typechain';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { getChainRpc } from '../utils/getChainRpc';
import { getAllEventArgs, getEventArg } from './utils';

enum DEXType {
  NoType,
  UniswapV3,
  PancakeswapV3,
}

const DEFAULT_SLIPPAGE_BPS = 9000;

const SMT_ADDRESS = '0xE631DABeF60c37a37d70d3B4f812871df663226f';
const SMT_PRICE_FEED = '0x0c2ed226c5AC01C01ebc8F6D74Dcd665fC6d6C71';
const USDCe_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const USDC_PRICE_FEED = '0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7';

const SMT_WHALE_ADDRESS = '0xf5419608AaaD7d3d8CBB11E21a7286eE8567C907';
const USDCe_WHALE_ADDRESS = '0x1891b583a86DAf0f149bA9712a61506138526c6f';
const USDC_WHALE_ADDRESS = '0x1347378B1d0Eb69d3462e09b3dFa2Fe28ebE74eC';

const DOTC = '0x22593B8749a4e4854C449c30054bb4d896374fa1';
const UNISWAP_FACTORY_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
const UNISWAP_ROUTER_ADDRESS = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45';
const UNISWAP_QUOTER_ADDRESS = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e';

const PANCAKESWAP_FACTORY_ADDRESS = '0x917933899c6a5F8E37F31E19f92CdBFF7e8FF0e2';
const PANCAKESWAP_ROUTER_ADDRESS = '0x3Ced11c610556e5292fBC2e75D68c3899098C14C';
const PANCAKESWAP_QUOTER_ADDRESS = '0xb1E835Dc2785b52265711e17fCCb0fd018226a6e';

const DESTINATION_CHAIN_SELECTOR = '5009297550715157269';
const CCIP_BRIDGE = '0x231710Ab6999E3468eBbfF6B9dC467a559f7a2d6';

describe('ChildSwarmBuyerBurner POL', () => {
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
    intermediateToken: USDCe_ADDRESS,
    finalToken: { token: USDC_ADDRESS, priceFeed: USDC_PRICE_FEED },
    swapV3Router: PANCAKESWAP_ROUTER_ADDRESS,
    swapV3Quoter: PANCAKESWAP_QUOTER_ADDRESS,
    swapV3Factory: PANCAKESWAP_FACTORY_ADDRESS,
  };

  before(async function () {
    await network.provider.request({
      method: 'hardhat_reset',
      params: [
        {
          forking: {
            jsonRpcUrl: getChainRpc('polygon'),
            blockNumber: 79828788,
            enable: true,
          },
        },
      ],
    });
  });

  after(async function () {
    await network.provider.request({
      method: 'hardhat_reset',
      params: [],
    });
  });

  async function fixture() {
    const [deployer] = await ethers.getSigners();

    const USDC_whale = await getSignerFromAddress(USDC_WHALE_ADDRESS);
    const SMT_whale = await getSignerFromAddress(SMT_WHALE_ADDRESS);
    const USDCe_whale = await getSignerFromAddress(USDCe_WHALE_ADDRESS);

    const USDC = await getToken(USDC_ADDRESS);
    const SMT = await getToken(SMT_ADDRESS);
    const USDCe = await getToken(USDCe_ADDRESS);

    const ccipConfig: BuyerBurnerCCIPCaller.CCIPConfigStruct = {
      destinationChainSelector: DESTINATION_CHAIN_SELECTOR,
      bridge: CCIP_BRIDGE,
      receiver: deployer.address,
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

    const quoter = await hre.ethers.getContractAt('IV3SwapQuoterV2', UNISWAP_QUOTER_ADDRESS);
    const dotc: DotcV2 = await hre.ethers.getContractAt('DotcV2', DOTC);

    return {
      USDC_whale,
      SMT_whale,
      USDCe_whale,
      deployer,
      USDC,
      SMT,
      USDCe,
      dotc,
      buyerBurner,
      quoter,
      ccipConfig,
    };
  }

  describe('Deployment', () => {
    it('Wont be initialized again', async () => {
      const { buyerBurner, ccipConfig } = await loadFixture(fixture);

      await expect(
        buyerBurner.initialize(
          DOTC,
          ccipConfig,
          [uniswapConfig, pancakeswapConfig],
          [
            { token: SMT_ADDRESS, priceFeed: SMT_ADDRESS },
            { token: USDCe_ADDRESS, priceFeed: USDC_PRICE_FEED },
          ],
        ),
      ).to.be.revertedWithCustomError(buyerBurner, 'InvalidInitialization');
    });
  });

  describe('Swap', () => {
    it('swap(USDCe to USDC); bridge(USDC)', async () => {
      const { USDCe_whale, USDCe, USDC, buyerBurner } = await loadFixture(fixture);

      const usdceAmount = ethers.utils.parseUnits('1', '6');

      await USDCe.connect(USDCe_whale).transfer(buyerBurner.address, usdceAmount);

      const swapTx = await buyerBurner.swap(DEXType.UniswapV3, DEFAULT_SLIPPAGE_BPS, {
        value: ethers.utils.parseEther('20'),
      });
      const swapReceipt = await swapTx.wait();
      const usd1AmountSwapped = getEventArg(swapReceipt, 'Swapped', 'amountOut');
      const messageId = getEventArg(swapReceipt, 'CCIPTransferSubmitted', 'messageId');

      await expect(swapTx)
        .to.emit(buyerBurner, 'CCIPTransferSubmitted')
        .withArgs(messageId, USDC.address, usd1AmountSwapped);
      await expect(swapTx).to.emit(buyerBurner, 'Swapped').withArgs(USDCe.address, USDC.address, usd1AmountSwapped);
    });

    it('swap(SMT to USDC); bridge(USDC)', async () => {
      const { SMT_whale, SMT, USDC, buyerBurner } = await loadFixture(fixture);

      const smtAmount = ethers.utils.parseEther('1');

      await SMT.connect(SMT_whale).transfer(buyerBurner.address, smtAmount);

      const swapTx = await buyerBurner.swap(DEXType.UniswapV3, DEFAULT_SLIPPAGE_BPS, {
        value: ethers.utils.parseEther('20'),
      });
      const swapReceipt = await swapTx.wait();
      const usd1AmountSwapped = getEventArg(swapReceipt, 'Swapped', 'amountOut');
      const messageId = getEventArg(swapReceipt, 'CCIPTransferSubmitted', 'messageId');

      await expect(swapTx)
        .to.emit(buyerBurner, 'CCIPTransferSubmitted')
        .withArgs(messageId, USDC.address, usd1AmountSwapped);
      await expect(swapTx).to.emit(buyerBurner, 'Swapped').withArgs(SMT.address, USDC.address, usd1AmountSwapped);
    });

    it('swap(all tokens to USDC); bridge(USDC)', async () => {
      const { SMT_whale, SMT, USDCe_whale, USDCe, USDC, buyerBurner } = await loadFixture(fixture);

      const smtAmount = ethers.utils.parseEther('1');
      const usdceAmount = ethers.utils.parseUnits('1', '6');

      await SMT.connect(SMT_whale).transfer(buyerBurner.address, smtAmount);
      await USDCe.connect(USDCe_whale).transfer(buyerBurner.address, usdceAmount);

      const swapTx = await buyerBurner.swap(DEXType.UniswapV3, DEFAULT_SLIPPAGE_BPS, {
        value: ethers.utils.parseEther('20'),
      });
      const swapReceipt = await swapTx.wait();
      const usd1AmountSwappedArray = getAllEventArgs(swapReceipt, 'Swapped', 'amountOut');
      const usd1AmountTransferred = getEventArg(swapReceipt, 'CCIPTransferSubmitted', 'amount');
      const messageId = getEventArg(swapReceipt, 'CCIPTransferSubmitted', 'messageId');

      await expect(swapTx)
        .to.emit(buyerBurner, 'CCIPTransferSubmitted')
        .withArgs(messageId, USDC.address, usd1AmountTransferred);
      await expect(swapTx)
        .to.emit(buyerBurner, 'Swapped')
        .withArgs(SMT.address, USDC.address, usd1AmountSwappedArray[0]);
      await expect(swapTx)
        .to.emit(buyerBurner, 'Swapped')
        .withArgs(USDCe.address, USDC.address, usd1AmountSwappedArray[1]);
    });
  });

  describe('MakeOffer', () => {
    it('trying swap(SMT to USDC); makeOffer(USDC)', async () => {
      const { SMT_whale, SMT, USDC, dotc, buyerBurner } = await loadFixture(fixture);

      const smtAmount = ethers.utils.parseEther('1');

      await SMT.connect(SMT_whale).transfer(buyerBurner.address, smtAmount);

      const futureOfferId = await dotc.currentOfferId();
      const swapTx = await buyerBurner.swap(DEXType.PancakeswapV3, DEFAULT_SLIPPAGE_BPS);
      const swapReceipt = await swapTx.wait();
      const offerId = getEventArg(swapReceipt, 'PoolNotExistOfferMade', 'offerId');

      expect(offerId).to.eq(futureOfferId);
      await expect(swapTx)
        .to.emit(buyerBurner, 'PoolNotExistOfferMade')
        .withArgs(offerId, SMT.address, smtAmount, USDC.address);
      await expect(swapTx).to.emit(dotc, 'CreatedOffer');
      expect((await dotc.allOffers(offerId)).depositAsset.assetAddress).to.eq(SMT.address);
      expect((await dotc.allOffers(offerId)).depositAsset.amount).to.eq(smtAmount);
      expect((await dotc.allOffers(offerId)).depositAsset.assetPrice.priceFeedAddress).to.eq(SMT_PRICE_FEED);
      expect((await dotc.allOffers(offerId)).withdrawalAsset.assetAddress).to.eq(USDC.address);
      expect((await dotc.allOffers(offerId)).withdrawalAsset.amount).to.gt(0);
      expect((await dotc.allOffers(offerId)).withdrawalAsset.assetPrice.priceFeedAddress).to.eq(USDC_PRICE_FEED);
    });
  });
});

async function getSignerFromAddress(address: string): Promise<SignerWithAddress> {
  await hre.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [address],
  });
  return await ethers.getSigner(address);
}

async function getToken(tokenAddress: string): Promise<IERC20Metadata> {
  return (await ethers.getContractAt(
    '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol:IERC20Metadata',
    tokenAddress,
  )) as IERC20Metadata;
}
