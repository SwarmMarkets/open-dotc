import { verifyContract } from '../helpers/verify-contract';

// Mumbai
// const dotcManager_address = '0x0Dfd10EDd2E1D7e32c8c7691B0FBA370f8520f21';
// const dotc_address = '0xdA83Aa565E2247a5eFed96d7FF566abF9E66AEDE';
// const escrow_address = '0x880674C7d2447Bdf8d474A77C2E535532EAc98f2';
// Polygon
// const dotcManager_address = '0xF8981283ac9691B7783a9086277665A962fC13f3';
// const dotc_address = '0x56CbAf03dBfBF4c73CDC7a63B523c895bbb4869F';
// const escrow_address = '0x4bAF3fAF58ccf73C7Ca8a5391B596797c3Ea3E2E';
// // Mainnet
// const dotcManager_address = '0xF8981283ac9691B7783a9086277665A962fC13f3';
// const dotc_address = '0x632F2fe528D59ae71eCd38d7F1fDf8D5b5B1CF25';
// const escrow_address = '0xB8ADaD01342D656D8f70Fe1fa55cc3FBb6965f7d';
// // Base sepolia
// const dotcManager_address = '0xFa1EDF1A0cEB62Db77c13da2DA99f17a81760D22';
// const dotc_address = '0x22b3346AF45169986efbc1Aa4c360501586DF954';
// const escrow_address = '0x599cf65c92423432b56847274005c10dADBfe0AC';
// Base mainnet
const dotcManager_address = '0x632F2fe528D59ae71eCd38d7F1fDf8D5b5B1CF25';
const dotc_address = '0xB8ADaD01342D656D8f70Fe1fa55cc3FBb6965f7d';
const escrow_address = '0x20A4253Fa2b23074C8e3C60529c4fD3174390516';

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
