import { verifyContract } from '../helpers/verify-contract';

const goldOz_address: string = '0xa896410401bF4759e1476ef196fe92824898E12E';

const goldKg_address: string = '0x0969C4233120ea77f3F54B9FD5143c61E2CDd2eE';

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
