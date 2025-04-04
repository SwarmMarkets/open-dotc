import hre from 'hardhat';
import { ignoreAlreadyVerifiedError } from './ignore-already-verified-error';

export const verifyContract = async (address: string, constructorArguments: Array<unknown> = [], libraries: Record<string, string> = {}): Promise<void> => {
  console.log(`Trying to verifying ${address}\n`);
  try {
    await hre.run('verify:verify', {
      address,
      constructorArguments,
      libraries
    });
    console.log('Successfully verified!');
  } catch (err) {
    console.log('Verification failed!!!');
    ignoreAlreadyVerifiedError(err);
  }
};
