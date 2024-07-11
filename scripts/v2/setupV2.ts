import { ethers } from 'hardhat';
import { DotcManagerV2 } from 'typechain';

const dotcManager_address: string = '0x3d47613D6d67757c2c900FFB93D90fE9582B9a40',
  dotc_address: string = '0x7C31E975fa5795eaFe284383e5F2B979ac946090',
  escrow_address: string = '0xd7F980c588B7D603B35b5584de22bE34FEf4AF13';

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
