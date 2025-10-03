import { ContractReceipt } from 'ethers';

export function getEventArg(receipt: ContractReceipt, eventName: string, argName: string) {
  const evt = receipt.events?.find(e => e.event === eventName);
  if (!evt) throw new Error(`Event ${eventName} not found`);
  return evt.args?.[argName];
}
