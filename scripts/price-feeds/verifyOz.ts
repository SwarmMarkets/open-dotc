import { verifyContract } from '../helpers/verify-contract';

const goldOz_address: string = '0x0a103eE32F4209926D8ba7e528AFf8a831Ed3daE';

async function main(): Promise<void> {
  await verifyContract(goldOz_address, [8, 'XAU Ounce / USD', 1]);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
