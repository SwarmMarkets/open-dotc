import { verifyContract } from '../helpers/verify-contract';

async function main(): Promise<void> {
  await verifyContract('0x54111D52864558A3CF7ec70C6b8da358d3Fda258');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
