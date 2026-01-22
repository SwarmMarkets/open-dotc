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

describe('ChildSwarmBuyerBurner BASE', () => {
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

  const pansmtswapConfig: BuyerBurnerSwapper.DexConfigStruct = {
    dexType: DEXType.PancakeswapV3,
    poolFees: {
      tier1: 1000,
      tier2: 5000,
      tier3: 25000,
      tier4: 100000,
    },
    intermediateToken: WETH_ADDRESS,
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
            jsonRpcUrl: getChainRpc('base'),
            blockNumber: 38783433,
            enable: true,
            accounts: { accountsBalance: '10000000000000000000000000' },
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
    const WETH_whale = await getSignerFromAddress(WETH_WHALE_ADDRESS);

    const gasFundAmount = ethers.utils.parseEther('1');
    await Promise.all([
      deployer.sendTransaction({ to: WETH_whale.address, value: gasFundAmount }),
      deployer.sendTransaction({ to: SMT_whale.address, value: gasFundAmount }),
      deployer.sendTransaction({ to: USDC_whale.address, value: gasFundAmount }),
    ]);

    const USDC = await getToken(USDC_ADDRESS);
    const SMT = await getToken(SMT_ADDRESS);
    const WETH = await getToken(WETH_ADDRESS);

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
        [uniswapConfig, pansmtswapConfig],
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

    const quoter = await hre.ethers.getContractAt('IV3SwapQuoterV2', UNISWAP_QUOTER_ADDRESS);
    const dotc: DotcV2 = await hre.ethers.getContractAt('DotcV2', DOTC);

    return {
      USDC_whale,
      SMT_whale,
      WETH_whale,
      deployer,
      USDC,
      SMT,
      WETH,
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
          [uniswapConfig, pansmtswapConfig],
          [
            { token: SMT_ADDRESS, priceFeed: SMT_ADDRESS },
            { token: WETH_ADDRESS, priceFeed: ETH_PRICE_FEED },
          ],
        ),
      ).to.be.revertedWithCustomError(buyerBurner, 'InvalidInitialization');
    });
  });

  describe('Swap', () => {
    it('swap(WETH to USDC); bridge(USDC)', async () => {
      const { WETH_whale, WETH, USDC, buyerBurner } = await loadFixture(fixture);

      const wethAmount = ethers.utils.parseEther('1');

      await WETH.connect(WETH_whale).transfer(buyerBurner.address, wethAmount);

      const swapTx = await buyerBurner.swap(DEXType.UniswapV3, DEFAULT_SLIPPAGE_BPS, {
        value: ethers.utils.parseEther('0.01'),
      });
      const swapReceipt = await swapTx.wait();
      const usdcAmountSwapped = getEventArg(swapReceipt, 'Swapped', 'amountOut');
      const messageId = getEventArg(swapReceipt, 'CCIPTransferSubmitted', 'messageId');

      await expect(swapTx)
        .to.emit(buyerBurner, 'CCIPTransferSubmitted')
        .withArgs(messageId, USDC.address, usdcAmountSwapped);
      await expect(swapTx).to.emit(buyerBurner, 'Swapped').withArgs(WETH.address, USDC.address, usdcAmountSwapped);
    });

    it('swap(SMT to USDC); bridge(USDC)', async () => {
      const { SMT_whale, SMT, USDC, buyerBurner } = await loadFixture(fixture);

      const smtAmount = ethers.utils.parseEther('1');

      await SMT.connect(SMT_whale).transfer(buyerBurner.address, smtAmount);

      const swapTx = await buyerBurner.swap(DEXType.UniswapV3, DEFAULT_SLIPPAGE_BPS, {
        value: ethers.utils.parseEther('0.01'),
      });
      const swapReceipt = await swapTx.wait();
      const usdcAmountSwapped = getEventArg(swapReceipt, 'Swapped', 'amountOut');
      const messageId = getEventArg(swapReceipt, 'CCIPTransferSubmitted', 'messageId');

      await expect(swapTx)
        .to.emit(buyerBurner, 'CCIPTransferSubmitted')
        .withArgs(messageId, USDC.address, usdcAmountSwapped);
      await expect(swapTx).to.emit(buyerBurner, 'Swapped').withArgs(SMT.address, USDC.address, usdcAmountSwapped);
    });

    it('swap(all tokens to USDC); bridge(USDC)', async () => {
      const { SMT_whale, SMT, WETH_whale, WETH, USDC, buyerBurner } = await loadFixture(fixture);

      const amount = ethers.utils.parseEther('1');

      await SMT.connect(SMT_whale).transfer(buyerBurner.address, amount);
      await WETH.connect(WETH_whale).transfer(buyerBurner.address, amount);

      const swapTx = await buyerBurner.swap(DEXType.UniswapV3, DEFAULT_SLIPPAGE_BPS, {
        value: ethers.utils.parseEther('0.02'),
      });
      const swapReceipt = await swapTx.wait();
      const usdcAmountSwappedArray = getAllEventArgs(swapReceipt, 'Swapped', 'amountOut');
      const usdcAmountTransferred = getEventArg(swapReceipt, 'CCIPTransferSubmitted', 'amount');
      const messageId = getEventArg(swapReceipt, 'CCIPTransferSubmitted', 'messageId');

      await expect(swapTx)
        .to.emit(buyerBurner, 'CCIPTransferSubmitted')
        .withArgs(messageId, USDC.address, usdcAmountTransferred);
      await expect(swapTx)
        .to.emit(buyerBurner, 'Swapped')
        .withArgs(SMT.address, USDC.address, usdcAmountSwappedArray[0]);
      await expect(swapTx)
        .to.emit(buyerBurner, 'Swapped')
        .withArgs(WETH.address, USDC.address, usdcAmountSwappedArray[1]);
    });
  });

  describe('MakeOffer', () => {
    it('trying swap(WETH to USDC); makeOffer(USDC)', async () => {
      const { WETH_whale, WETH, USDC, dotc, buyerBurner } = await loadFixture(fixture);

      const wethAmount = ethers.utils.parseEther('1');

      await WETH.connect(WETH_whale).transfer(buyerBurner.address, wethAmount);

      const futureOfferId = await dotc.currentOfferId();
      const swapTx = await buyerBurner.swap(DEXType.PancakeswapV3, DEFAULT_SLIPPAGE_BPS);
      const swapReceipt = await swapTx.wait();
      const offerId = getEventArg(swapReceipt, 'PoolNotExistOfferMade', 'offerId');

      expect(offerId).to.eq(futureOfferId);
      await expect(swapTx)
        .to.emit(buyerBurner, 'PoolNotExistOfferMade')
        .withArgs(offerId, WETH.address, wethAmount, USDC.address);
      await expect(swapTx).to.emit(dotc, 'CreatedOffer');
      expect((await dotc.allOffers(offerId)).depositAsset.assetAddress).to.eq(WETH.address);
      expect((await dotc.allOffers(offerId)).depositAsset.amount).to.eq(wethAmount);
      expect((await dotc.allOffers(offerId)).depositAsset.assetPrice.priceFeedAddress).to.eq(ETH_PRICE_FEED);
      expect((await dotc.allOffers(offerId)).withdrawalAsset.assetAddress).to.eq(USDC.address);
      expect((await dotc.allOffers(offerId)).withdrawalAsset.amount).to.gt(0);
      expect((await dotc.allOffers(offerId)).withdrawalAsset.assetPrice.priceFeedAddress).to.eq(USDC_PRICE_FEED);
    });

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

    it('trying swap(all tokens to USDC); makeOffer(USDC)', async () => {
      const { WETH_whale, WETH, SMT_whale, SMT, USDC, dotc, buyerBurner } = await loadFixture(fixture);

      const amount = ethers.utils.parseEther('1');

      await SMT.connect(SMT_whale).transfer(buyerBurner.address, amount);
      await WETH.connect(WETH_whale).transfer(buyerBurner.address, amount);

      const futureOfferId = await dotc.currentOfferId();
      const swapTx = await buyerBurner.swap(DEXType.PancakeswapV3, DEFAULT_SLIPPAGE_BPS);
      const swapReceipt = await swapTx.wait();
      const offerIdArray = getAllEventArgs(swapReceipt, 'PoolNotExistOfferMade', 'offerId');

      expect(offerIdArray[0]).to.eq(futureOfferId);
      await expect(swapTx)
        .to.emit(buyerBurner, 'PoolNotExistOfferMade')
        .withArgs(offerIdArray[0], SMT.address, amount, USDC.address);
      await expect(swapTx)
        .to.emit(buyerBurner, 'PoolNotExistOfferMade')
        .withArgs(offerIdArray[1], WETH.address, amount, USDC.address);
      await expect(swapTx).to.emit(dotc, 'CreatedOffer');

      expect((await dotc.allOffers(offerIdArray[0])).depositAsset.assetAddress).to.eq(SMT.address);
      expect((await dotc.allOffers(offerIdArray[0])).depositAsset.amount).to.eq(amount);
      expect((await dotc.allOffers(offerIdArray[0])).depositAsset.assetPrice.priceFeedAddress).to.eq(SMT_PRICE_FEED);
      expect((await dotc.allOffers(offerIdArray[0])).withdrawalAsset.assetAddress).to.eq(USDC.address);
      expect((await dotc.allOffers(offerIdArray[0])).withdrawalAsset.amount).to.gt(0);
      expect((await dotc.allOffers(offerIdArray[0])).withdrawalAsset.assetPrice.priceFeedAddress).to.eq(
        USDC_PRICE_FEED,
      );

      expect((await dotc.allOffers(offerIdArray[1])).depositAsset.assetAddress).to.eq(WETH.address);
      expect((await dotc.allOffers(offerIdArray[1])).depositAsset.amount).to.eq(amount);
      expect((await dotc.allOffers(offerIdArray[1])).depositAsset.assetPrice.priceFeedAddress).to.eq(ETH_PRICE_FEED);
      expect((await dotc.allOffers(offerIdArray[1])).withdrawalAsset.assetAddress).to.eq(USDC.address);
      expect((await dotc.allOffers(offerIdArray[1])).withdrawalAsset.amount).to.gt(0);
      expect((await dotc.allOffers(offerIdArray[1])).withdrawalAsset.assetPrice.priceFeedAddress).to.eq(
        USDC_PRICE_FEED,
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
