import { verifyContract } from '../helpers/verify-contract';

async function main(): Promise<void> {
  await verifyContract('0x93c3465B4Cd9B6555298FD0DABF1C8E6fb3B864b');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
