import hre, { ethers, network } from 'hardhat';
import { BigNumber, ContractFactory } from 'ethers';
import { expect } from 'chai';
import { SwarmBuyerBurner, IERC20Metadata } from '../typechain';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { getAllEventArgs, getEventArg } from './utils';
import { getChainRpc } from '../utils/getChainRpc';

const USDC_WHALE_ADDRESS = '0x28C6c06298d514Db089934071355E5743bf21d60';
const WETH_WHALE_ADDRESS = '0x57757E3D981446D585Af0D9Ae4d7DF6D64647806';
const SMT_WHALE_ADDRESS = '0x9642b23Ed1E01Df1092B92641051881a322F5D4E';
const WBTC_WHALE_ADDRESS = '0xE940ae8cF59fE2709BBc572CBAD2633fB45Abf46';

const SMT_ADDRESS = '0xB17548c7B510427baAc4e267BEa62e800b247173';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const WBTC_ADDRESS = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';

const UNISWAP_FACTORY_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
const UNISWAP_ROUTER_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
const UNISWAP_QUOTER_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6';

const POOL_FEE = 3000;

describe.only('SwarmBuyerBurner', () => {
  const addressZero = ethers.constants.AddressZero;

  before(async function () {
    await network.provider.request({
      method: 'hardhat_reset',
      params: [
        {
          forking: {
            jsonRpcUrl: getChainRpc('mainnet'),
            blockNumber: 22773991,
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
    const buyerBurner: SwarmBuyerBurner = (await SwarmBuyerBurner.deploy(
      WETH_ADDRESS,
      SMT_ADDRESS,
      [USDC_ADDRESS, WETH_ADDRESS, WBTC_ADDRESS],
      UNISWAP_FACTORY_ADDRESS,
      UNISWAP_ROUTER_ADDRESS,
      UNISWAP_QUOTER_ADDRESS,
    )) as SwarmBuyerBurner;
    await buyerBurner.deployed();

    const quoter = await hre.ethers.getContractAt('IQuoter', UNISWAP_QUOTER_ADDRESS);

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
      buyerBurner,
      quoter,
    };
  }

  describe('Multihop swaps', () => {
    it('swapExactInputMultihopUSDCforSMT', async () => {
      const { USDC_whale, USDC, SMT, buyerBurner, quoter } = await loadFixture(fixture);

      const usdcAmount: BigNumber = BigNumber.from(120 * 1e6);
      const path = ethers.utils.solidityPack(
        ['address', 'uint24', 'address', 'uint24', 'address'],
        [USDC_ADDRESS, POOL_FEE, WETH_ADDRESS, POOL_FEE, SMT_ADDRESS],
      );
      const smtAmount = await quoter.callStatic.quoteExactInput(path, usdcAmount);

      await USDC.connect(USDC_whale).transfer(buyerBurner.address, usdcAmount);

      const swapTx = await buyerBurner.swapExactInputMultihop();
      const swapReceipt = await swapTx.wait();
      const smtAmountBurned = getEventArg(swapReceipt, 'SwappedExactInputMultihop', 'amountOut');

      expect(smtAmountBurned).to.eq(smtAmount);
      await expect(swapTx).to.emit(buyerBurner, 'SwappedExactInputMultihop').withArgs(USDC_ADDRESS, smtAmount);
      await expect(swapTx).to.emit(SMT, 'Transfer').withArgs(buyerBurner.address, addressZero, smtAmount);
    });

    it('swapExactInputMultihopWETHforSMT', async () => {
      const { WETH_whale, WETH, SMT, buyerBurner, quoter } = await loadFixture(fixture);

      const wethAmount: BigNumber = BigNumber.from(120 * 1e6);
      const path = ethers.utils.solidityPack(['address', 'uint24', 'address'], [WETH_ADDRESS, POOL_FEE, SMT_ADDRESS]);
      const smtAmount = await quoter.callStatic.quoteExactInput(path, wethAmount);

      await WETH.connect(WETH_whale).transfer(buyerBurner.address, wethAmount);

      const swapTx = await buyerBurner.swapExactInputMultihop();
      const swapReceipt = await swapTx.wait();
      const smtAmountBurned = getEventArg(swapReceipt, 'SwappedExactInputMultihop', 'amountOut');

      expect(smtAmountBurned).to.eq(smtAmount);
      await expect(swapTx).to.emit(buyerBurner, 'SwappedExactInputMultihop').withArgs(WETH_ADDRESS, smtAmount);
      await expect(swapTx).to.emit(SMT, 'Transfer').withArgs(buyerBurner.address, addressZero, smtAmount);
    });

    it('swapExactInputMultihopWETHforSMT', async () => {
      const { WBTC_whale, WBTC, SMT, buyerBurner, quoter } = await loadFixture(fixture);

      const wbtcAmount: BigNumber = BigNumber.from(120 * 1e6);
      const path = ethers.utils.solidityPack(
        ['address', 'uint24', 'address', 'uint24', 'address'],
        [WBTC_ADDRESS, POOL_FEE, WETH_ADDRESS, POOL_FEE, SMT_ADDRESS],
      );
      const smtAmount = await quoter.callStatic.quoteExactInput(path, wbtcAmount);

      await WBTC.connect(WBTC_whale).transfer(buyerBurner.address, wbtcAmount);

      const swapTx = await buyerBurner.swapExactInputMultihop();
      const swapReceipt = await swapTx.wait();
      const smtAmountBurned = getEventArg(swapReceipt, 'SwappedExactInputMultihop', 'amountOut');

      expect(smtAmountBurned).to.eq(smtAmount);
      await expect(swapTx).to.emit(buyerBurner, 'SwappedExactInputMultihop').withArgs(WBTC_ADDRESS, smtAmount);
      await expect(swapTx).to.emit(SMT, 'Transfer').withArgs(buyerBurner.address, addressZero, smtAmount);
    });

    it('swapExactInputMultihopForSMT', async () => {
      const { USDC_whale, USDC, WETH_whale, WETH, WBTC_whale, WBTC, SMT, buyerBurner, quoter } = await loadFixture(
        fixture,
      );

      const usdcAmount: BigNumber = BigNumber.from(120 * 1e6);
      const usdcPath = ethers.utils.solidityPack(
        ['address', 'uint24', 'address', 'uint24', 'address'],
        [USDC_ADDRESS, POOL_FEE, WETH_ADDRESS, POOL_FEE, SMT_ADDRESS],
      );
      const smtfromUsdcAmount = await quoter.callStatic.quoteExactInput(usdcPath, usdcAmount);

      const wethAmount: BigNumber = BigNumber.from(120 * 1e6);
      const wethPath = ethers.utils.solidityPack(
        ['address', 'uint24', 'address'],
        [WETH_ADDRESS, POOL_FEE, SMT_ADDRESS],
      );
      const smtFromWethAmount = await quoter.callStatic.quoteExactInput(wethPath, wethAmount);

      const wbtcAmount: BigNumber = BigNumber.from(120 * 1e6);
      const wbtcPath = ethers.utils.solidityPack(
        ['address', 'uint24', 'address', 'uint24', 'address'],
        [WBTC_ADDRESS, POOL_FEE, WETH_ADDRESS, POOL_FEE, SMT_ADDRESS],
      );
      const smtFromWbtcAmount = await quoter.callStatic.quoteExactInput(wbtcPath, wbtcAmount);

      await USDC.connect(USDC_whale).transfer(buyerBurner.address, usdcAmount);
      await WETH.connect(WETH_whale).transfer(buyerBurner.address, wethAmount);
      await WBTC.connect(WBTC_whale).transfer(buyerBurner.address, wbtcAmount);

      const swapTx = await buyerBurner.swapExactInputMultihop();
      const swapReceipt = await swapTx.wait();
      const smtAmountsBurnedArray = getAllEventArgs(swapReceipt, 'SwappedExactInputMultihop', 'amountOut');

      const staticSmtBurned = smtfromUsdcAmount.add(smtFromWethAmount).add(smtFromWbtcAmount);
      const actualSmtBurned: BigNumber = smtAmountsBurnedArray.reduce((acc, amt) => acc.add(amt), BigNumber.from(0));

      expect(smtAmountsBurnedArray[0]).to.be.lte(smtfromUsdcAmount);
      expect(smtAmountsBurnedArray[1]).to.be.lte(smtFromWethAmount);
      expect(smtAmountsBurnedArray[2]).to.be.lte(smtFromWbtcAmount);
      expect(actualSmtBurned).to.lte(smtfromUsdcAmount.add(smtFromWethAmount).add(smtFromWbtcAmount));
      expect(actualSmtBurned).to.be.lte(staticSmtBurned);
      await expect(swapTx)
        .to.emit(buyerBurner, 'SwappedExactInputMultihop')
        .withArgs(USDC_ADDRESS, smtAmountsBurnedArray[0]);
      await expect(swapTx)
        .to.emit(buyerBurner, 'SwappedExactInputMultihop')
        .withArgs(WETH_ADDRESS, smtAmountsBurnedArray[1]);
      await expect(swapTx)
        .to.emit(buyerBurner, 'SwappedExactInputMultihop')
        .withArgs(WBTC_ADDRESS, smtAmountsBurnedArray[2]);
      await expect(swapTx).to.emit(SMT, 'Transfer').withArgs(buyerBurner.address, addressZero, actualSmtBurned);
    });
  });

  it('Withdraw tokens', async () => {
    const { USDC_whale, USDC, buyerBurner, deployer } = await loadFixture(fixture);

    const usdc_amount = 120 * 1e6;

    await USDC.connect(USDC_whale).transfer(buyerBurner.address, usdc_amount);

    await buyerBurner.connect(deployer).withdrawTokens(USDC.address, usdc_amount);

    expect(await USDC.balanceOf(await buyerBurner.owner())).to.be.eq(usdc_amount);
  });

  it('Burn SMT', async () => {
    const { SMT_whale, SMT, buyerBurner, deployer } = await loadFixture(fixture);

    const smt_amount = ethers.utils.parseEther('1');

    await SMT.connect(SMT_whale).transfer(buyerBurner.address, smt_amount);

    await buyerBurner.connect(deployer).burnSMT(smt_amount);

    expect(await SMT.balanceOf(await buyerBurner.address)).to.be.eq(0);
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
