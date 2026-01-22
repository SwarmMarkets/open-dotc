import hre from 'hardhat';

export async function getLastBlockTimestamp(): Promise<number> {
  const currentBlock = await hre.ethers.provider.getBlock('latest');
  return currentBlock.timestamp;
}
