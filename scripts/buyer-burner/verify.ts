import { verifyContract } from '../helpers/verify-contract';

async function main(): Promise<void> {
  await verifyContract('0x6EeF13b30Db3e2d423Ba79F53e90533a3C3F56c6');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
