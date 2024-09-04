import { verifyContract } from './helpers/verify-contract';

const assetHelper_address: string = '0xa8E289653a03c5611E1F6320258C77c574c5F159',
  offerHelper_address: string = '0xEE6d8763fFbdFA74cd383A1DE6370d336dE224C7',
  dotcOfferHelper_address: string = '0xaa8E11FCbCadeBBB2301d1dDA51cCfa6F9ac5276';

const dotcManager_address: string = '0xe155a3E42EfcdAB6dDD763F8aecB7160671D6b0f',
  dotc_address: string = '0x8352819830D8e7aC9Ad47e981De76D0085747253',
  escrow_address: string = '0x87bf586BB01c161e0d2c1C09ccC8A790de4ddcAC';

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
