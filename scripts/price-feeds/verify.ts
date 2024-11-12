import { verifyContract } from '../helpers/verify-contract';

const price_feed: string = '0x1F954Dc24a49708C26E0C1777f16750B5C6d5a2c';

const pf: string = '0xdbE01287763d37fC2d660f13cda9B25b6c73739f';

async function main(): Promise<void> {
	await verifyContract(pf, [price_feed]);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch((error: Error) => {
		console.error(error);
		process.exit(1);
	});
