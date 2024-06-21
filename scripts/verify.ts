import { verifyContract } from './helpers/verify-contract';

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
// // Base mainnet
// const dotcManager_address = '0x632F2fe528D59ae71eCd38d7F1fDf8D5b5B1CF25';
// const dotc_address = '0xB8ADaD01342D656D8f70Fe1fa55cc3FBb6965f7d';
// const escrow_address = '0x20A4253Fa2b23074C8e3C60529c4fD3174390516';
// // Arbitrum/OP mainnet (Swarm)
// const dotcManager_address = '0xEBAca49E966f0e7B93198b0Dab1e307366adE65f';
// const dotc_address = '0x4347f00991AC8372bbCf2E5BA34A0Ea415989aB0';
// const escrow_address = '0x1606FA059b8C4Ed1b4297e3530922e2A3C145eA7';
// // Arbitrum/OP mainnet (SwarmX)
// const dotcManager_address = '0x2fcAb60dc6Ad65be5F2Aae6a1B2E2ecB93017888';
// const dotc_address = '0x820758b04721Bd0B69a091fE8ef657D936bf35c5';
// const escrow_address = '0x632F2fe528D59ae71eCd38d7F1fDf8D5b5B1CF25';
// // BASE (SwarmX)
// const dotc_address = '0x1d0D0516385D2ff6748A3b87Ba2C2cC37F287D4a';
// // Polygon (SwarmX)
// const dotc_address = '0x429737c0DdF17779803Aba8B5E6133012952B4c3';

// // Mainnet Sepolia
// const dotcManager_address = '0xf6014B638F9DFF3BD90d7bbDD87e7C061e6c35d5';
// const dotc_address = '0x8Ced68405bEa7f37E6F0Ae825F052A466BA198af';
// const escrow_address = '0x450507c2BeBAe848939D8ab5F81DcA0937436ba1';

// Arbitrum Sepolia
// const dotcManager_address = '0x1eD467ae51faC45Db475597ccA46643505310c7b';
const dotc_address = '0x88EEfd075Da6f7185c39713296183Cd052eEfd0D';
// const escrow_address = '0xC618800af6d1b08771407Fb0d072E28f8D9E0700';

async function main(): Promise<void> {
  // await verifyContract(dotcManager_address);

  await verifyContract(dotc_address);

  // await verifyContract(escrow_address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
