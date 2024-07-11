import { ethers } from 'hardhat';
import { DotcManagerV2 } from 'typechain';

const dotcManager_address: string = '',
  dotc_address: string = '',
  escrow_address: string = '';

async function main() {
  const dotcManager = await ethers.getContractAt('DotcManagerV2', dotcManager_address) as DotcManagerV2;

  await (await dotcManager.changeEscrow(escrow_address)).wait(1);
  await (await dotcManager.changeDotc(dotc_address)).wait(1);
  await (await dotcManager.changeDotcInEscrow()).wait(1);
  await (await dotcManager.changeEscrowInDotc()).wait(1);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
