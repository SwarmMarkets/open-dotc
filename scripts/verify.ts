import { verifyContract } from './helpers/verify-contract';

const dotcManager_address: string = '',
  dotc_address: string = '',
  escrow_address: string = '';

async function main(): Promise<void> {
  await verifyContract(dotcManager_address);

  await verifyContract(dotc_address);

  await verifyContract(escrow_address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
