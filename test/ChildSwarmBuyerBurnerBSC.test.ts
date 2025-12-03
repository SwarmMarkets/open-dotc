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

const USD1_ADDRESS = '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d';
const USD1_PRICE_FEED = '0xaD8b4e59A7f25B68945fAf0f3a3EAF027832FFB0';
const CAKE_ADDRESS = '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82';
const CAKE_PRICE_FEED = '0xB6064eD41d4f67e353768aA239cA86f4F73665a1';
const WBNB_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const BNB_PRICE_FEED = '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE';

const USD1_WHALE_ADDRESS = '0xF977814e90dA44bFA03b6295A0616a897441aceC';
const CAKE_WHALE_ADDRESS = '0xF977814e90dA44bFA03b6295A0616a897441aceC';
const WBNB_WHALE_ADDRESS = '0x308000D0169Ebe674B7640f0c415f44c6987d04D';

const DOTC = '0x17Fe797082FA229789c9197FE10fD205540cAbDD';
const UNISWAP_FACTORY_ADDRESS = '0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7';
const UNISWAP_ROUTER_ADDRESS = '0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2';
const UNISWAP_QUOTER_ADDRESS = '0x78D78E420Da98ad378D7799bE8f4AF69033EB077';

const PANCAKESWAP_FACTORY_ADDRESS = '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865';
const PANCAKESWAP_ROUTER_ADDRESS = '0x1b81D678ffb9C0263b24A97847620C99d213eB14';
const PANCAKESWAP_QUOTER_ADDRESS = '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997';

const DESTINATION_CHAIN_SELECTOR = '5009297550715157269';
const CCIP_BRIDGE = '0x2B418D9B1e0C203Ab93c8b5A54258Bb3E6BAbbc6';

describe('ChildSwarmBuyerBurner BSC', () => {
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
    intermediateToken: WBNB_ADDRESS,
    finalToken: { token: USD1_ADDRESS, priceFeed: USD1_PRICE_FEED },
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
            jsonRpcUrl: getChainRpc('bsc'),
            blockNumber: 70348130,
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

    const USD1_whale = await getSignerFromAddress(USD1_WHALE_ADDRESS);
    const CAKE_whale = await getSignerFromAddress(CAKE_WHALE_ADDRESS);
    const WBNB_whale = await getSignerFromAddress(WBNB_WHALE_ADDRESS);

    const USD1 = await getToken(USD1_ADDRESS);
    const CAKE = await getToken(CAKE_ADDRESS);
    const WBNB = await getToken(WBNB_ADDRESS);

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

    const quoter = await hre.ethers.getContractAt('IV3SwapQuoterV2', UNISWAP_QUOTER_ADDRESS);
    const dotc: DotcV2 = await hre.ethers.getContractAt('DotcV2', DOTC);

    return {
      USD1_whale,
      CAKE_whale,
      WBNB_whale,
      deployer,
      USD1,
      CAKE,
      WBNB,
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
            { token: CAKE_ADDRESS, priceFeed: CAKE_ADDRESS },
            { token: WBNB_ADDRESS, priceFeed: BNB_PRICE_FEED },
          ],
        ),
      ).to.be.revertedWithCustomError(buyerBurner, 'InvalidInitialization');
    });
  });

  describe('Swap', () => {
    it('swap(WBNB to USD1); bridge(USD1)', async () => {
      const { WBNB_whale, WBNB, USD1, buyerBurner } = await loadFixture(fixture);

      const wbnbAmount = ethers.utils.parseEther('1');

      await WBNB.connect(WBNB_whale).transfer(buyerBurner.address, wbnbAmount);

      const swapTx = await buyerBurner.swap(DEXType.PancakeswapV3, { value: ethers.utils.parseEther('0.01') });
      const swapReceipt = await swapTx.wait();
      const usd1AmountSwapped = getEventArg(swapReceipt, 'Swapped', 'amountOut');
      const messageId = getEventArg(swapReceipt, 'CCIPTransferSubmitted', 'messageId');

      await expect(swapTx)
        .to.emit(buyerBurner, 'CCIPTransferSubmitted')
        .withArgs(messageId, USD1.address, usd1AmountSwapped);
      await expect(swapTx).to.emit(buyerBurner, 'Swapped').withArgs(WBNB.address, USD1.address, usd1AmountSwapped);
    });

    it('swap(CAKE to USD1); bridge(USD1)', async () => {
      const { CAKE_whale, CAKE, USD1, buyerBurner } = await loadFixture(fixture);

      const cakeAmount = ethers.utils.parseEther('1');

      await CAKE.connect(CAKE_whale).transfer(buyerBurner.address, cakeAmount);

      const swapTx = await buyerBurner.swap(DEXType.PancakeswapV3, { value: ethers.utils.parseEther('0.01') });
      const swapReceipt = await swapTx.wait();
      const usd1AmountSwapped = getEventArg(swapReceipt, 'Swapped', 'amountOut');
      const messageId = getEventArg(swapReceipt, 'CCIPTransferSubmitted', 'messageId');

      await expect(swapTx)
        .to.emit(buyerBurner, 'CCIPTransferSubmitted')
        .withArgs(messageId, USD1.address, usd1AmountSwapped);
      await expect(swapTx).to.emit(buyerBurner, 'Swapped').withArgs(CAKE.address, USD1.address, usd1AmountSwapped);
    });

    it('swap(all tokens to USD1); bridge(USD1)', async () => {
      const { CAKE_whale, CAKE, WBNB_whale, WBNB, USD1, buyerBurner } = await loadFixture(fixture);

      const amount = ethers.utils.parseEther('1');

      await CAKE.connect(CAKE_whale).transfer(buyerBurner.address, amount);
      await WBNB.connect(WBNB_whale).transfer(buyerBurner.address, amount);

      const swapTx = await buyerBurner.swap(DEXType.PancakeswapV3, { value: ethers.utils.parseEther('0.02') });
      const swapReceipt = await swapTx.wait();
      const usd1AmountSwappedArray = getAllEventArgs(swapReceipt, 'Swapped', 'amountOut');
      const usd1AmountTransferred = getEventArg(swapReceipt, 'CCIPTransferSubmitted', 'amount');
      const messageId = getEventArg(swapReceipt, 'CCIPTransferSubmitted', 'messageId');

      await expect(swapTx)
        .to.emit(buyerBurner, 'CCIPTransferSubmitted')
        .withArgs(messageId, USD1.address, usd1AmountTransferred);
      await expect(swapTx)
        .to.emit(buyerBurner, 'Swapped')
        .withArgs(CAKE.address, USD1.address, usd1AmountSwappedArray[0]);
      await expect(swapTx)
        .to.emit(buyerBurner, 'Swapped')
        .withArgs(WBNB.address, USD1.address, usd1AmountSwappedArray[1]);
    });
  });

  describe('MakeOffer', () => {
    it('trying swap(WBNB to USD1); makeOffer(USD1)', async () => {
      const { WBNB_whale, WBNB, USD1, dotc, buyerBurner } = await loadFixture(fixture);

      const wbnbAmount = ethers.utils.parseEther('1');

      await WBNB.connect(WBNB_whale).transfer(buyerBurner.address, wbnbAmount);

      const futureOfferId = await dotc.currentOfferId();
      const swapTx = await buyerBurner.swap(DEXType.UniswapV3);
      const swapReceipt = await swapTx.wait();
      const offerId = getEventArg(swapReceipt, 'PoolNotExistOfferMade', 'offerId');

      expect(offerId).to.eq(futureOfferId);
      await expect(swapTx)
        .to.emit(buyerBurner, 'PoolNotExistOfferMade')
        .withArgs(offerId, WBNB.address, wbnbAmount, USD1.address);
      await expect(swapTx).to.emit(dotc, 'CreatedOffer');
      expect((await dotc.allOffers(offerId)).depositAsset.assetAddress).to.eq(WBNB.address);
      expect((await dotc.allOffers(offerId)).depositAsset.amount).to.eq(wbnbAmount);
      expect((await dotc.allOffers(offerId)).depositAsset.assetPrice.priceFeedAddress).to.eq(BNB_PRICE_FEED);
      expect((await dotc.allOffers(offerId)).withdrawalAsset.assetAddress).to.eq(USD1.address);
      expect((await dotc.allOffers(offerId)).withdrawalAsset.amount).to.gt(0);
      expect((await dotc.allOffers(offerId)).withdrawalAsset.assetPrice.priceFeedAddress).to.eq(USD1_PRICE_FEED);
    });

    it('trying swap(CAKE to USD1); makeOffer(USD1)', async () => {
      const { CAKE_whale, CAKE, USD1, dotc, buyerBurner } = await loadFixture(fixture);

      const cakeAmount = ethers.utils.parseEther('1');

      await CAKE.connect(CAKE_whale).transfer(buyerBurner.address, cakeAmount);

      const futureOfferId = await dotc.currentOfferId();
      const swapTx = await buyerBurner.swap(DEXType.UniswapV3);
      const swapReceipt = await swapTx.wait();
      const offerId = getEventArg(swapReceipt, 'PoolNotExistOfferMade', 'offerId');

      expect(offerId).to.eq(futureOfferId);
      await expect(swapTx)
        .to.emit(buyerBurner, 'PoolNotExistOfferMade')
        .withArgs(offerId, CAKE.address, cakeAmount, USD1.address);
      await expect(swapTx).to.emit(dotc, 'CreatedOffer');
      expect((await dotc.allOffers(offerId)).depositAsset.assetAddress).to.eq(CAKE.address);
      expect((await dotc.allOffers(offerId)).depositAsset.amount).to.eq(cakeAmount);
      expect((await dotc.allOffers(offerId)).depositAsset.assetPrice.priceFeedAddress).to.eq(CAKE_PRICE_FEED);
      expect((await dotc.allOffers(offerId)).withdrawalAsset.assetAddress).to.eq(USD1.address);
      expect((await dotc.allOffers(offerId)).withdrawalAsset.amount).to.gt(0);
      expect((await dotc.allOffers(offerId)).withdrawalAsset.assetPrice.priceFeedAddress).to.eq(USD1_PRICE_FEED);
    });

    it('trying swap(all tokens to USD1); makeOffer(USD1)', async () => {
      const { WBNB_whale, WBNB, CAKE_whale, CAKE, USD1, dotc, buyerBurner } = await loadFixture(fixture);

      const amount = ethers.utils.parseEther('1');

      await CAKE.connect(CAKE_whale).transfer(buyerBurner.address, amount);
      await WBNB.connect(WBNB_whale).transfer(buyerBurner.address, amount);

      const futureOfferId = await dotc.currentOfferId();
      const swapTx = await buyerBurner.swap(DEXType.UniswapV3);
      const swapReceipt = await swapTx.wait();
      const offerIdArray = getAllEventArgs(swapReceipt, 'PoolNotExistOfferMade', 'offerId');

      expect(offerIdArray[0]).to.eq(futureOfferId);
      await expect(swapTx)
        .to.emit(buyerBurner, 'PoolNotExistOfferMade')
        .withArgs(offerIdArray[0], CAKE.address, amount, USD1.address);
      await expect(swapTx)
        .to.emit(buyerBurner, 'PoolNotExistOfferMade')
        .withArgs(offerIdArray[1], WBNB.address, amount, USD1.address);
      await expect(swapTx).to.emit(dotc, 'CreatedOffer');

      expect((await dotc.allOffers(offerIdArray[0])).depositAsset.assetAddress).to.eq(CAKE.address);
      expect((await dotc.allOffers(offerIdArray[0])).depositAsset.amount).to.eq(amount);
      expect((await dotc.allOffers(offerIdArray[0])).depositAsset.assetPrice.priceFeedAddress).to.eq(CAKE_PRICE_FEED);
      expect((await dotc.allOffers(offerIdArray[0])).withdrawalAsset.assetAddress).to.eq(USD1.address);
      expect((await dotc.allOffers(offerIdArray[0])).withdrawalAsset.amount).to.gt(0);
      expect((await dotc.allOffers(offerIdArray[0])).withdrawalAsset.assetPrice.priceFeedAddress).to.eq(
        USD1_PRICE_FEED,
      );

      expect((await dotc.allOffers(offerIdArray[1])).depositAsset.assetAddress).to.eq(WBNB.address);
      expect((await dotc.allOffers(offerIdArray[1])).depositAsset.amount).to.eq(amount);
      expect((await dotc.allOffers(offerIdArray[1])).depositAsset.assetPrice.priceFeedAddress).to.eq(BNB_PRICE_FEED);
      expect((await dotc.allOffers(offerIdArray[1])).withdrawalAsset.assetAddress).to.eq(USD1.address);
      expect((await dotc.allOffers(offerIdArray[1])).withdrawalAsset.amount).to.gt(0);
      expect((await dotc.allOffers(offerIdArray[1])).withdrawalAsset.assetPrice.priceFeedAddress).to.eq(
        USD1_PRICE_FEED,
      );
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
