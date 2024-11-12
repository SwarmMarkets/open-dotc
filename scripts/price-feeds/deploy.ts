import { ethers } from 'hardhat';
import { ContractFactory } from 'ethers';

const price_feed: string = '0x1F954Dc24a49708C26E0C1777f16750B5C6d5a2c';

async function main() {
	const GoldKiloPriceFeed: ContractFactory = await ethers.getContractFactory('GoldKiloPriceFeed');
	const pf = await GoldKiloPriceFeed.deploy(price_feed);
	await pf.deployed();
	console.log('PriceFeed: ', pf.address);
}

main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});
