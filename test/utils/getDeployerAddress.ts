import hre from 'hardhat';

export async function getDeployerAddress(): Promise<string> {
  const [deployer] = await hre.ethers.getSigners();
  return deployer.address;
}
