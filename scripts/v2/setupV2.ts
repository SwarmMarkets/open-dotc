import { ethers } from 'hardhat';
import { DotcManagerV2 } from 'typechain';

const dotcManager_address: string = '0xe155a3E42EfcdAB6dDD763F8aecB7160671D6b0f',
  dotc_address: string = '0x8352819830D8e7aC9Ad47e981De76D0085747253',
  escrow_address: string = '0x87bf586BB01c161e0d2c1C09ccC8A790de4ddcAC';

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
