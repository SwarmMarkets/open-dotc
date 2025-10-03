import { ContractReceipt } from 'ethers';

// utils.ts
export function getAllEventArgs(receipt: ContractReceipt, eventName: string, argName: string): any[] {
  const evts = receipt.events?.filter(e => e.event === eventName) ?? [];
  if (evts.length === 0) {
    throw new Error(`No events named "${eventName}" found`);
  }
  // e.args[argName] works if you used a named param in Solidity;
  // otherwise use e.args[index]
  return evts.map(e => e.args![argName]);
}
