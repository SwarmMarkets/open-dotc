import { verifyContract } from '../helpers/verify-contract';

const goldOz_address: string = '0x86896fEB19D8A607c3b11f2aF50A0f239Bd71CD0';

const goldKg_address: string = '0xe9e59bB874741E50C8322c3BaBB02BE0066455f5';

async function main(): Promise<void> {
  await verifyContract(goldKg_address, [goldOz_address]);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
