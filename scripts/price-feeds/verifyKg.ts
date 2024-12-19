import { verifyContract } from '../helpers/verify-contract';

const goldOz_address: string = '0x0a103eE32F4209926D8ba7e528AFf8a831Ed3daE';

const goldKg_address: string = '0x2B418D9B1e0C203Ab93c8b5A54258Bb3E6BAbbc6';

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
