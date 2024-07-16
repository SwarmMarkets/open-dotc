import { verifyContract } from './helpers/verify-contract';

const assetHelper_address: string = '0xDcE64dA7278c0D5E33b0ECb5423966c542D43a46',
  offerHelper_address: string = '0x0dFf9718E9BeaB3d3eE243d1a5f5fc7B5fD93951',
  dotcOfferHelper_address: string = '0x0350A98320487FeB747fa7FCEE2Fea3725D72493';

const dotcManager_address: string = '0x3d47613D6d67757c2c900FFB93D90fE9582B9a40',
  dotc_address: string = '0x7C31E975fa5795eaFe284383e5F2B979ac946090',
  escrow_address: string = '0xd7F980c588B7D603B35b5584de22bE34FEf4AF13';

async function main(): Promise<void> {
  await verifyContract(assetHelper_address);
  await verifyContract(offerHelper_address,
    [],
    {
      AssetHelper: assetHelper_address,
    });
  await verifyContract(dotcOfferHelper_address);

  await verifyContract(dotcManager_address);
  await verifyContract(dotc_address,
    [],
    {
      AssetHelper: assetHelper_address,
      OfferHelper: offerHelper_address,
      DotcOfferHelper: dotcOfferHelper_address,
    }
  );
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
