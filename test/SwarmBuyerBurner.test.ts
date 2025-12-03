import hre, { ethers, network, upgrades } from 'hardhat';
import { BigNumber, ContractFactory } from 'ethers';
import { expect } from 'chai';
import { SwarmBuyerBurner, IERC20Metadata, BuyerBurnerSwapper, DotcV2 } from '../typechain';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { getChainRpc } from '../utils/getChainRpc';
import { getAllEventArgs, getEventArg } from './utils';
import { TokenInfoStruct } from 'typechain/contracts/buyer-burner/ChildSwarmBuyerBurner';

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

const USDC_WHALE_ADDRESS = '0x37305B1cD40574E4C5Ce33f8e8306Be057fD7341';
const WETH_WHALE_ADDRESS = '0x8EB8a3b98659Cce290402893d0123abb75E3ab28';
const SMT_WHALE_ADDRESS = '0x3CC936b795A188F0e246cBB2D74C5Bd190aeCF18';
const WBTC_WHALE_ADDRESS = '0xed805ac246F441Ea0D057B81d910EF1e39EB5995';

const DOTC = '0x0a103eE32F4209926D8ba7e528AFf8a831Ed3daE';
const UNISWAP_FACTORY_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
const UNISWAP_ROUTER_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
const UNISWAP_QUOTER_ADDRESS = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e';

const PANCAKESWAP_FACTORY_ADDRESS = '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865';
const PANCAKESWAP_ROUTER_ADDRESS = '0x1b81D678ffb9C0263b24A97847620C99d213eB14';
const PANCAKESWAP_QUOTER_ADDRESS = '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997';

const POOL_FEE = 3000;

describe('SwarmBuyerBurner', () => {
  const addressZero = ethers.constants.AddressZero;
  const defaultWhitelist: TokenInfoStruct[] = [
    { token: USDC_ADDRESS, priceFeed: USDC_PRICE_FEED },
    { token: WETH_ADDRESS, priceFeed: ETH_PRICE_FEED },
    { token: WBTC_ADDRESS, priceFeed: BTC_PRICE_FEED },
  ];

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
    intermediateToken: addressZero,
    finalToken: { token: SMT_ADDRESS, priceFeed: SMT_PRICE_FEED },
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
            jsonRpcUrl: getChainRpc('mainnet'),
            blockNumber: 23932727,
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

    const SMT_whale = await getSignerFromAddress(SMT_WHALE_ADDRESS);
    const USDC_whale = await getSignerFromAddress(USDC_WHALE_ADDRESS);
    const WETH_whale = await getSignerFromAddress(WETH_WHALE_ADDRESS);
    const WBTC_whale = await getSignerFromAddress(WBTC_WHALE_ADDRESS);

    const SMT = await getToken(SMT_ADDRESS);
    const USDC = await getToken(USDC_ADDRESS);
    const WETH = await getToken(WETH_ADDRESS);
    const WBTC = await getToken(WBTC_ADDRESS);

    const SwarmBuyerBurner: ContractFactory = await ethers.getContractFactory('SwarmBuyerBurner');
    const buyerBurner: SwarmBuyerBurner = (await upgrades.deployProxy(
      SwarmBuyerBurner,
      [DOTC, [uniswapConfig, pancakeswapConfig], defaultWhitelist],
      {
        unsafeAllow: ['constructor'],
        unsafeAllowLinkedLibraries: true,
      },
    )) as SwarmBuyerBurner;
    await buyerBurner.deployed();

    const quoter = await hre.ethers.getContractAt('IV3SwapQuoterV2', UNISWAP_QUOTER_ADDRESS);
    const dotc: DotcV2 = await hre.ethers.getContractAt('DotcV2', DOTC);

    return {
      SMT_whale,
      USDC_whale,
      WETH_whale,
      WBTC_whale,
      deployer,
      SMT,
      USDC,
      WETH,
      WBTC,
      dotc,
      buyerBurner,
      quoter,
    };
  }

  describe('Deployment', () => {
    it('Wont be initialized again', async () => {
      const { buyerBurner } = await loadFixture(fixture);

      await expect(
        buyerBurner.initialize(DOTC, [uniswapConfig, pancakeswapConfig], defaultWhitelist),
      ).to.be.revertedWithCustomError(buyerBurner, 'InvalidInitialization');
    });
  });

  describe('Whitelisted tokens', () => {
    it('returns the current whitelist', async () => {
      const { buyerBurner } = await loadFixture(fixture);

      const tokens = await buyerBurner.getWhitelistedTokens();

      expect(tokens.map(({ token, priceFeed }) => ({ token, priceFeed }))).to.deep.equal(defaultWhitelist);

      const tokenToAdd: TokenInfoStruct = { token: buyerBurner.address, priceFeed: USDC_PRICE_FEED };

      await buyerBurner.addTokens([tokenToAdd]);

      const tokensAfterAdd = await buyerBurner.getWhitelistedTokens();
      expect(tokensAfterAdd.map(({ token, priceFeed }) => ({ token, priceFeed }))).to.deep.equal([
        ...defaultWhitelist,
        tokenToAdd,
      ]);

      await buyerBurner.removeTokens([defaultWhitelist[1].token]);

      const tokensAfterRemove = await buyerBurner.getWhitelistedTokens();
      expect(tokensAfterRemove.map(({ token, priceFeed }) => ({ token, priceFeed }))).to.deep.equal([
        defaultWhitelist[0],
        tokenToAdd,
        defaultWhitelist[2],
      ]);
    });

    it('checks whitelist membership', async () => {
      const { buyerBurner } = await loadFixture(fixture);

      for (const tokenInfo of defaultWhitelist) {
        expect(await buyerBurner.isTokenWhitelisted(tokenInfo.token)).to.eq(true);
      }

      const tokenToAdd: TokenInfoStruct = { token: buyerBurner.address, priceFeed: USDC_PRICE_FEED };

      expect(await buyerBurner.isTokenWhitelisted(tokenToAdd.token)).to.eq(false);

      await buyerBurner.addTokens([tokenToAdd]);

      expect(await buyerBurner.isTokenWhitelisted(tokenToAdd.token)).to.eq(true);

      await buyerBurner.removeTokens([tokenToAdd.token]);

      expect(await buyerBurner.isTokenWhitelisted(tokenToAdd.token)).to.eq(false);
    });
  });

  describe('Swap', () => {
    it('swap(USDC to SMT); burn(SMT)', async () => {
      const { USDC_whale, USDC, SMT, buyerBurner, quoter } = await loadFixture(fixture);

      const usdcAmount: BigNumber = BigNumber.from(120 * 1e6);
      const path = ethers.utils.solidityPack(
        ['address', 'uint24', 'address', 'uint24', 'address'],
        [USDC_ADDRESS, POOL_FEE, WETH_ADDRESS, POOL_FEE, SMT_ADDRESS],
      );
      const { amountOut: smtAmount } = await quoter.callStatic.quoteExactInput(path, usdcAmount);

      await USDC.connect(USDC_whale).transfer(buyerBurner.address, usdcAmount);

      const swapTx = await buyerBurner.swap(DEXType.UniswapV3);
      const swapReceipt = await swapTx.wait();
      const smtAmountBurned = getEventArg(swapReceipt, 'Swapped', 'amountOut');

      expect(smtAmountBurned).to.eq(smtAmount);
      await expect(swapTx).to.emit(buyerBurner, 'Swapped').withArgs(USDC_ADDRESS, SMT_ADDRESS, smtAmount);
      await expect(swapTx).to.emit(SMT, 'Transfer').withArgs(buyerBurner.address, addressZero, smtAmount);
    });

    it('swap(WETH to ETH); burn(SMT)', async () => {
      const { WETH_whale, WETH, SMT, buyerBurner, quoter } = await loadFixture(fixture);

      const wethAmount: BigNumber = BigNumber.from(120 * 1e6);
      const path = ethers.utils.solidityPack(['address', 'uint24', 'address'], [WETH_ADDRESS, POOL_FEE, SMT_ADDRESS]);
      const { amountOut: smtAmount } = await quoter.callStatic.quoteExactInput(path, wethAmount);

      await WETH.connect(WETH_whale).transfer(buyerBurner.address, wethAmount);

      const swapTx = await buyerBurner.swap(DEXType.UniswapV3);
      const swapReceipt = await swapTx.wait();
      const smtAmountBurned = getEventArg(swapReceipt, 'Swapped', 'amountOut');

      expect(smtAmountBurned).to.eq(smtAmount);
      await expect(swapTx).to.emit(buyerBurner, 'Swapped').withArgs(WETH_ADDRESS, SMT_ADDRESS, smtAmount);
      await expect(swapTx).to.emit(SMT, 'Transfer').withArgs(buyerBurner.address, addressZero, smtAmount);
    });

    it('swap(WBTC to ETH); burn(SMT)', async () => {
      const { WBTC_whale, WBTC, SMT, buyerBurner, quoter } = await loadFixture(fixture);

      const wbtcAmount: BigNumber = BigNumber.from(120 * 1e6);
      const path = ethers.utils.solidityPack(
        ['address', 'uint24', 'address', 'uint24', 'address'],
        [WBTC_ADDRESS, POOL_FEE, WETH_ADDRESS, POOL_FEE, SMT_ADDRESS],
      );
      const { amountOut: smtAmount } = await quoter.callStatic.quoteExactInput(path, wbtcAmount);

      await WBTC.connect(WBTC_whale).transfer(buyerBurner.address, wbtcAmount);

      const swapTx = await buyerBurner.swap(DEXType.UniswapV3);
      const swapReceipt = await swapTx.wait();
      const smtAmountBurned = getEventArg(swapReceipt, 'Swapped', 'amountOut');

      expect(smtAmountBurned).to.eq(smtAmount);
      await expect(swapTx).to.emit(buyerBurner, 'Swapped').withArgs(WBTC_ADDRESS, SMT_ADDRESS, smtAmount);
      await expect(swapTx).to.emit(SMT, 'Transfer').withArgs(buyerBurner.address, addressZero, smtAmount);
    });

    it('swap(all tokens for SMT); burn(SMT)', async () => {
      const { USDC_whale, USDC, WETH_whale, WETH, WBTC_whale, WBTC, SMT, buyerBurner, quoter } = await loadFixture(
        fixture,
      );

      const usdcAmount: BigNumber = BigNumber.from(120 * 1e6);
      const usdcPath = ethers.utils.solidityPack(
        ['address', 'uint24', 'address', 'uint24', 'address'],
        [USDC_ADDRESS, POOL_FEE, WETH_ADDRESS, POOL_FEE, SMT_ADDRESS],
      );
      const { amountOut: smtfromUsdcAmount } = await quoter.callStatic.quoteExactInput(usdcPath, usdcAmount);

      const wethAmount: BigNumber = BigNumber.from(120 * 1e6);
      const wethPath = ethers.utils.solidityPack(
        ['address', 'uint24', 'address'],
        [WETH_ADDRESS, POOL_FEE, SMT_ADDRESS],
      );
      const { amountOut: smtFromWethAmount } = await quoter.callStatic.quoteExactInput(wethPath, wethAmount);

      const wbtcAmount: BigNumber = BigNumber.from(120 * 1e6);
      const wbtcPath = ethers.utils.solidityPack(
        ['address', 'uint24', 'address', 'uint24', 'address'],
        [WBTC_ADDRESS, POOL_FEE, WETH_ADDRESS, POOL_FEE, SMT_ADDRESS],
      );
      const { amountOut: smtFromWbtcAmount } = await quoter.callStatic.quoteExactInput(wbtcPath, wbtcAmount);

      await USDC.connect(USDC_whale).transfer(buyerBurner.address, usdcAmount);
      await WETH.connect(WETH_whale).transfer(buyerBurner.address, wethAmount);
      await WBTC.connect(WBTC_whale).transfer(buyerBurner.address, wbtcAmount);

      const swapTx = await buyerBurner.swap(DEXType.UniswapV3);
      const swapReceipt = await swapTx.wait();
      const smtAmountsBurnedArray = getAllEventArgs(swapReceipt, 'Swapped', 'amountOut');

      const staticSmtBurned = smtfromUsdcAmount.add(smtFromWethAmount).add(smtFromWbtcAmount);
      const actualSmtBurned: BigNumber = smtAmountsBurnedArray.reduce((acc, amt) => acc.add(amt), BigNumber.from(0));

      expect(smtAmountsBurnedArray[0]).to.be.lte(smtfromUsdcAmount);
      expect(smtAmountsBurnedArray[1]).to.be.lte(smtFromWethAmount);
      expect(smtAmountsBurnedArray[2]).to.be.lte(smtFromWbtcAmount);
      expect(actualSmtBurned).to.lte(smtfromUsdcAmount.add(smtFromWethAmount).add(smtFromWbtcAmount));
      expect(actualSmtBurned).to.be.lte(staticSmtBurned);
      await expect(swapTx)
        .to.emit(buyerBurner, 'Swapped')
        .withArgs(USDC_ADDRESS, SMT_ADDRESS, smtAmountsBurnedArray[0]);
      await expect(swapTx)
        .to.emit(buyerBurner, 'Swapped')
        .withArgs(WETH_ADDRESS, SMT_ADDRESS, smtAmountsBurnedArray[1]);
      await expect(swapTx)
        .to.emit(buyerBurner, 'Swapped')
        .withArgs(WBTC_ADDRESS, SMT_ADDRESS, smtAmountsBurnedArray[2]);
      await expect(swapTx).to.emit(SMT, 'Transfer').withArgs(buyerBurner.address, addressZero, actualSmtBurned);
    });
  });

  describe('MakeOffer', () => {
    it('trying swap(USDC to SMT); makeOffer(SMT)', async () => {
      const { USDC_whale, USDC, SMT, dotc, buyerBurner } = await loadFixture(fixture);

      const usdcAmount: BigNumber = BigNumber.from(120 * 1e6);

      await USDC.connect(USDC_whale).transfer(buyerBurner.address, usdcAmount);

      const futureOfferId = await dotc.currentOfferId();
      const swapTx = await buyerBurner.swap(DEXType.PancakeswapV3);
      const swapReceipt = await swapTx.wait();
      const offerId = getEventArg(swapReceipt, 'PoolNotExistOfferMade', 'offerId');

      expect(offerId).to.eq(futureOfferId);
      await expect(swapTx)
        .to.emit(buyerBurner, 'PoolNotExistOfferMade')
        .withArgs(offerId, USDC.address, usdcAmount, SMT.address);
      await expect(swapTx).to.emit(dotc, 'CreatedOffer');
      expect((await dotc.allOffers(offerId)).depositAsset.assetAddress).to.eq(USDC.address);
      expect((await dotc.allOffers(offerId)).depositAsset.amount).to.eq(usdcAmount);
      expect((await dotc.allOffers(offerId)).depositAsset.assetPrice.priceFeedAddress).to.eq(USDC_PRICE_FEED);
      expect((await dotc.allOffers(offerId)).withdrawalAsset.assetAddress).to.eq(SMT.address);
      expect((await dotc.allOffers(offerId)).withdrawalAsset.amount).to.gt(0);
      expect((await dotc.allOffers(offerId)).withdrawalAsset.assetPrice.priceFeedAddress).to.eq(SMT_PRICE_FEED);

      await expect(buyerBurner.connect(USDC_whale).cancelOffer(offerId)).to.be.revertedWithCustomError(
        buyerBurner,
        'Unauthorized',
      );
      const cancelTx = await buyerBurner.cancelOffer(offerId);
      await expect(cancelTx).to.emit(dotc, 'CanceledOffer');
    });

    it('trying swap(WETH to ETH); makeOffer(SMT)', async () => {
      const { WETH_whale, WETH, SMT, dotc, buyerBurner } = await loadFixture(fixture);

      const wethAmount: BigNumber = BigNumber.from(120 * 1e6);

      await WETH.connect(WETH_whale).transfer(buyerBurner.address, wethAmount);

      const futureOfferId = await dotc.currentOfferId();
      const swapTx = await buyerBurner.swap(DEXType.PancakeswapV3);
      const swapReceipt = await swapTx.wait();
      const offerId = getEventArg(swapReceipt, 'PoolNotExistOfferMade', 'offerId');

      expect(offerId).to.eq(futureOfferId);
      await expect(swapTx)
        .to.emit(buyerBurner, 'PoolNotExistOfferMade')
        .withArgs(offerId, WETH.address, wethAmount, SMT.address);
      await expect(swapTx).to.emit(dotc, 'CreatedOffer');
      expect((await dotc.allOffers(offerId)).depositAsset.assetAddress).to.eq(WETH.address);
      expect((await dotc.allOffers(offerId)).depositAsset.amount).to.eq(wethAmount);
      expect((await dotc.allOffers(offerId)).depositAsset.assetPrice.priceFeedAddress).to.eq(ETH_PRICE_FEED);
      expect((await dotc.allOffers(offerId)).withdrawalAsset.assetAddress).to.eq(SMT.address);
      expect((await dotc.allOffers(offerId)).withdrawalAsset.amount).to.gt(0);
      expect((await dotc.allOffers(offerId)).withdrawalAsset.assetPrice.priceFeedAddress).to.eq(SMT_PRICE_FEED);

      await expect(buyerBurner.connect(WETH_whale).cancelOffer(offerId)).to.be.revertedWithCustomError(
        buyerBurner,
        'Unauthorized',
      );
      const cancelTx = await buyerBurner.cancelOffer(offerId);
      await expect(cancelTx).to.emit(dotc, 'CanceledOffer');
    });

    it('trying swap(WBTC to ETH); makeOffer(SMT)', async () => {
      const { WBTC_whale, WBTC, SMT, dotc, buyerBurner } = await loadFixture(fixture);

      const wbtcAmount: BigNumber = BigNumber.from(120 * 1e6);

      await WBTC.connect(WBTC_whale).transfer(buyerBurner.address, wbtcAmount);

      const futureOfferId = await dotc.currentOfferId();
      const swapTx = await buyerBurner.swap(DEXType.PancakeswapV3);
      const swapReceipt = await swapTx.wait();
      const offerId = getEventArg(swapReceipt, 'PoolNotExistOfferMade', 'offerId');

      expect(offerId).to.eq(futureOfferId);
      await expect(swapTx)
        .to.emit(buyerBurner, 'PoolNotExistOfferMade')
        .withArgs(offerId, WBTC.address, wbtcAmount, SMT.address);
      await expect(swapTx).to.emit(dotc, 'CreatedOffer');
      expect((await dotc.allOffers(offerId)).depositAsset.assetAddress).to.eq(WBTC.address);
      expect((await dotc.allOffers(offerId)).depositAsset.amount).to.eq(wbtcAmount);
      expect((await dotc.allOffers(offerId)).depositAsset.assetPrice.priceFeedAddress).to.eq(BTC_PRICE_FEED);
      expect((await dotc.allOffers(offerId)).withdrawalAsset.assetAddress).to.eq(SMT.address);
      expect((await dotc.allOffers(offerId)).withdrawalAsset.amount).to.gt(0);
      expect((await dotc.allOffers(offerId)).withdrawalAsset.assetPrice.priceFeedAddress).to.eq(SMT_PRICE_FEED);

      await expect(buyerBurner.connect(WBTC_whale).cancelOffer(offerId)).to.be.revertedWithCustomError(
        buyerBurner,
        'Unauthorized',
      );
      const cancelTx = await buyerBurner.cancelOffer(offerId);
      await expect(cancelTx).to.emit(dotc, 'CanceledOffer');
    });

    it('trying swap(all tokens for SMT); makeOffers(SMT)', async () => {
      const { USDC_whale, USDC, WETH_whale, WETH, WBTC_whale, WBTC, SMT, buyerBurner, dotc } = await loadFixture(
        fixture,
      );

      const usdcAmount: BigNumber = BigNumber.from(120 * 1e6);
      const wethAmount: BigNumber = BigNumber.from(120 * 1e6);
      const wbtcAmount: BigNumber = BigNumber.from(120 * 1e6);

      await USDC.connect(USDC_whale).transfer(buyerBurner.address, usdcAmount);
      await WETH.connect(WETH_whale).transfer(buyerBurner.address, wethAmount);
      await WBTC.connect(WBTC_whale).transfer(buyerBurner.address, wbtcAmount);

      const futureOfferId = await dotc.currentOfferId();
      const swapTx = await buyerBurner.swap(DEXType.PancakeswapV3);
      const swapReceipt = await swapTx.wait();
      const offerIds = getAllEventArgs(swapReceipt, 'PoolNotExistOfferMade', 'offerId');

      expect(offerIds[0]).to.eq(futureOfferId);
      expect(offerIds[1]).to.eq(futureOfferId.add(1));
      expect(offerIds[2]).to.eq(futureOfferId.add(2));
      await expect(swapTx)
        .to.emit(buyerBurner, 'PoolNotExistOfferMade')
        .withArgs(offerIds[0], USDC.address, usdcAmount, SMT.address);
      await expect(swapTx)
        .to.emit(buyerBurner, 'PoolNotExistOfferMade')
        .withArgs(offerIds[1], WETH.address, wethAmount, SMT.address);
      await expect(swapTx)
        .to.emit(buyerBurner, 'PoolNotExistOfferMade')
        .withArgs(offerIds[2], WBTC.address, wbtcAmount, SMT.address);
      await expect(swapTx).to.emit(dotc, 'CreatedOffer');

      expect((await dotc.allOffers(offerIds[0])).depositAsset.assetAddress).to.eq(USDC.address);
      expect((await dotc.allOffers(offerIds[0])).depositAsset.amount).to.eq(usdcAmount);
      expect((await dotc.allOffers(offerIds[0])).depositAsset.assetPrice.priceFeedAddress).to.eq(USDC_PRICE_FEED);
      expect((await dotc.allOffers(offerIds[0])).withdrawalAsset.assetAddress).to.eq(SMT.address);
      expect((await dotc.allOffers(offerIds[0])).withdrawalAsset.amount).to.gt(0);
      expect((await dotc.allOffers(offerIds[0])).withdrawalAsset.assetPrice.priceFeedAddress).to.eq(SMT_PRICE_FEED);

      expect((await dotc.allOffers(offerIds[1])).depositAsset.amount).to.eq(wethAmount);
      expect((await dotc.allOffers(offerIds[1])).depositAsset.assetAddress).to.eq(WETH.address);
      expect((await dotc.allOffers(offerIds[1])).depositAsset.assetPrice.priceFeedAddress).to.eq(ETH_PRICE_FEED);
      expect((await dotc.allOffers(offerIds[1])).withdrawalAsset.assetAddress).to.eq(SMT.address);
      expect((await dotc.allOffers(offerIds[1])).withdrawalAsset.amount).to.gt(0);
      expect((await dotc.allOffers(offerIds[1])).withdrawalAsset.assetPrice.priceFeedAddress).to.eq(SMT_PRICE_FEED);

      expect((await dotc.allOffers(offerIds[2])).depositAsset.assetAddress).to.eq(WBTC.address);
      expect((await dotc.allOffers(offerIds[2])).depositAsset.amount).to.eq(wbtcAmount);
      expect((await dotc.allOffers(offerIds[2])).depositAsset.assetPrice.priceFeedAddress).to.eq(BTC_PRICE_FEED);
      expect((await dotc.allOffers(offerIds[2])).withdrawalAsset.assetAddress).to.eq(SMT.address);
      expect((await dotc.allOffers(offerIds[2])).withdrawalAsset.amount).to.gt(0);
      expect((await dotc.allOffers(offerIds[2])).withdrawalAsset.assetPrice.priceFeedAddress).to.eq(SMT_PRICE_FEED);

      let cancelTx = await buyerBurner.cancelOffer(offerIds[0]);
      await expect(cancelTx).to.emit(dotc, 'CanceledOffer');

      cancelTx = await buyerBurner.cancelOffer(offerIds[1]);
      await expect(cancelTx).to.emit(dotc, 'CanceledOffer');

      cancelTx = await buyerBurner.cancelOffer(offerIds[2]);
      await expect(cancelTx).to.emit(dotc, 'CanceledOffer');
    });
  });

  describe('Admin functions', () => {
    it('Set Dex config', async () => {
      const { buyerBurner, SMT_whale } = await loadFixture(fixture);

      await buyerBurner.removeDexConfig(DEXType.PancakeswapV3);

      await expect(buyerBurner.connect(SMT_whale).setDexConfigs([pancakeswapConfig])).to.be.revertedWithCustomError(
        buyerBurner,
        'Unauthorized',
      );

      const removeTx = await buyerBurner.setDexConfigs([pancakeswapConfig]);

      await expect(removeTx).to.emit(buyerBurner, 'DexConfigSet');
    });

    it('Remove Dex config', async () => {
      const { buyerBurner, SMT_whale } = await loadFixture(fixture);

      await expect(buyerBurner.connect(SMT_whale).removeDexConfig(DEXType.PancakeswapV3)).to.be.revertedWithCustomError(
        buyerBurner,
        'Unauthorized',
      );

      const removeTx = await buyerBurner.removeDexConfig(DEXType.PancakeswapV3);

      await expect(removeTx).to.emit(buyerBurner, 'DexConfigRemoved').withArgs(DEXType.PancakeswapV3);
    });

    it('Add tokens', async () => {
      const { buyerBurner, USDC_whale } = await loadFixture(fixture);

      const tokenToAdd: TokenInfoStruct = {
        token: buyerBurner.address,
        priceFeed: USDC_PRICE_FEED,
      };

      await expect(buyerBurner.connect(USDC_whale).addTokens([tokenToAdd])).to.be.revertedWithCustomError(
        buyerBurner,
        'Unauthorized',
      );
      const addTx = await buyerBurner.addTokens([tokenToAdd]);

      await expect(buyerBurner.addTokens([tokenToAdd]))
        .to.be.revertedWithCustomError(buyerBurner, 'TokenWhitelisted')
        .withArgs(buyerBurner.address);

      await expect(addTx).to.emit(buyerBurner, 'Whitelisted');
    });

    it('Remove tokens', async () => {
      const { buyerBurner, USDC_whale } = await loadFixture(fixture);

      const tokenToAdd: TokenInfoStruct = {
        token: buyerBurner.address,
        priceFeed: USDC_PRICE_FEED,
      };
      await buyerBurner.addTokens([tokenToAdd]);

      await expect(buyerBurner.connect(USDC_whale).removeTokens([buyerBurner.address])).to.be.revertedWithCustomError(
        buyerBurner,
        'Unauthorized',
      );

      const removeTx = await buyerBurner.removeTokens([buyerBurner.address]);

      await expect(buyerBurner.removeTokens([buyerBurner.address]))
        .to.be.revertedWithCustomError(buyerBurner, 'TokenNotWhitelisted')
        .withArgs(buyerBurner.address);

      await expect(removeTx).to.emit(buyerBurner, 'Unwhitelisted').withArgs(buyerBurner.address);
    });

    it('Withdraw tokens', async () => {
      const { USDC_whale, USDC, buyerBurner } = await loadFixture(fixture);

      const usdc_amount = 120 * 1e6;

      await USDC.connect(USDC_whale).transfer(buyerBurner.address, usdc_amount);

      await expect(
        buyerBurner.connect(USDC_whale).withdrawTokens(USDC.address, usdc_amount),
      ).to.be.revertedWithCustomError(buyerBurner, 'Unauthorized');

      await buyerBurner.withdrawTokens(USDC.address, usdc_amount);

      expect(await USDC.balanceOf(await buyerBurner.owner())).to.be.eq(usdc_amount);
    });

    it('Burn SMT', async () => {
      const { SMT_whale, SMT, buyerBurner } = await loadFixture(fixture);

      const smt_amount = ethers.utils.parseEther('1');

      await SMT.connect(SMT_whale).transfer(buyerBurner.address, smt_amount);

      await expect(buyerBurner.connect(SMT_whale).burnSMT(smt_amount)).to.be.revertedWithCustomError(
        buyerBurner,
        'Unauthorized',
      );

      await buyerBurner.burnSMT(smt_amount);

      expect(await SMT.balanceOf(buyerBurner.address)).to.be.eq(0);
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
