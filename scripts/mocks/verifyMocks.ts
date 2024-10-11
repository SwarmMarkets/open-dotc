import { verifyContract } from './helpers/verify-contract';

const AuthTrue: string = '0xd57642925a5E287F90b04CE74bFC1218B41Cd4b8',
  AuthFalse: string = '0x357A28B3a543bcEB9a2C1Ba795F07D23cD1F1f68';

const PriceFeed_USDC: string = '0xE8317935Afe9126668Ff3e306B1BeAAf1693254F',
  PriceFeed_ETH: string = '0x43B525fDD277C9c56bb7E8B4206890DEe306F290',
  PriceFeed_Gold: string = '0xc0047fB798af785112204502F4220b4601926899';

const ERC20_6: string = '0xa144F12d9d121474129bba63B6DCEe28CbAf0856',
  ERC20_18: string = '0x0c39589605DC00922e3762588961DE39eAfA4395',
  ERC721: string = '0x447F13e8c3a710D64bC6268534C47344F45373f7',
  ERC1155: string = '0xF998e4b2057371CE7f526C2FF359Ad549EbBDdD9';

async function main(): Promise<void> {
  await verifyContract(AuthTrue, [true]);
  await verifyContract('0x357A28B3a543bcEB9a2C1Ba795F07D23cD1F1f68', [false]);

  await verifyContract(PriceFeed_USDC, [99999257]);
  await verifyContract(PriceFeed_ETH, [304097411980]);
  await verifyContract(PriceFeed_Gold, [236069005000]);

  await verifyContract(ERC20_6, [6]);
  await verifyContract(ERC20_18, [18]);
  await verifyContract(ERC721);
  await verifyContract(ERC1155);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
