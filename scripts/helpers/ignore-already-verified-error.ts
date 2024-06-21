export const ignoreAlreadyVerifiedError = (err: Error): void => {
  if (err.message.includes('Already Verified')) {
    console.log('Contract already verified, skipping');

    return;
  } else {
    throw err;
  }
};
