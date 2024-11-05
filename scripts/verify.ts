import { verifyContract } from './helpers/verify-contract';

const assetHelper_address: string = '0xd8eE688174647D0a933D76B728Ebd1A98940C87F',
  offerHelper_address: string = '0x20A4253Fa2b23074C8e3C60529c4fD3174390516',
  dotcOfferHelper_address: string = '0xB934aa7FdbE973Dd1b1ed23924dc79F5dff8da9E';

const dotcManager_address: string = '0x2680E82fB8beb5a153A67Fe687FFa67ABb6b9013',
  dotc_address: string = '0xAa4aEeCEEe9e1587fEa0084f35126523DD96eAd1',
  escrow_address: string = '0xEe15D4c721D01c9c1295108dE8975dE184F5730d';

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
