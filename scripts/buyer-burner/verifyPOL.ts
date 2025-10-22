import { verifyContract } from '../helpers/verify-contract';

async function main(): Promise<void> {
  await verifyContract('0x62b8068e190d373379d853DAF5661dFA701523bD');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
