export const THORCHAIN_ADDRESS_REGEX = /^(?:t?thor)1[ac-hj-np-z02-9]{38,}$/;

export function isValidTHORChainAddress(address: string): boolean {
  return THORCHAIN_ADDRESS_REGEX.test(address);
}
