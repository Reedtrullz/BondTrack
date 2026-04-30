import { describe, expect, it } from 'vitest';
import {
  generateBondMemo,
  generateUnbondMemo,
  parseRuneAmountToBaseUnits,
  validateBondAmount,
  validateThorAddress,
} from './bond';

describe('transaction memo and amount helpers', () => {
  it('keeps a BOND amount out of the provider-address memo slot', () => {
    const node = 'thor16xxh3km6dxka636qg6q7e3us5vlgvhrhjgw245';

    expect(generateBondMemo(node)).toBe(`BOND:${node}`);
  });

  it('only includes an advanced provider address in a BOND memo when supplied separately', () => {
    const node = 'thor16xxh3km6dxka636qg6q7e3us5vlgvhrhjgw245';
    const provider = 'thor158qequwhhnggm4ch4psv55yqpxsugf67n62dy2';

    expect(generateBondMemo(node, provider, '1000')).toBe(`BOND:${node}:${provider}:1000`);
  });

  it('converts decimal RUNE amounts to exact 1e8 base units', () => {
    expect(parseRuneAmountToBaseUnits('10')).toBe('1000000000');
    expect(parseRuneAmountToBaseUnits('1.02000001')).toBe('102000001');
    expect(parseRuneAmountToBaseUnits('0.00000001')).toBe('1');
  });

  it('rejects malformed or over-precision RUNE amounts', () => {
    expect(parseRuneAmountToBaseUnits('1.02abc')).toBeNull();
    expect(parseRuneAmountToBaseUnits('1.123456789')).toBeNull();
    expect(parseRuneAmountToBaseUnits('-1')).toBeNull();
  });

  it('generates UNBOND memos in 1e8 base units', () => {
    const node = 'thor16xxh3km6dxka636qg6q7e3us5vlgvhrhjgw245';

    expect(generateUnbondMemo(node, '10')).toBe(`UNBOND:${node}:1000000000`);
  });

  it('validates bond amounts with strict decimal parsing', () => {
    expect(validateBondAmount('1.02').valid).toBe(true);
    expect(validateBondAmount('1.02abc').valid).toBe(false);
    expect(validateBondAmount('1.123456789').valid).toBe(false);
    expect(validateBondAmount('1.01').valid).toBe(false);
  });

  it('validates THORChain-looking addresses before signing/memo generation', () => {
    expect(validateThorAddress('thor158qequwhhnggm4ch4psv55yqpxsugf67n62dy2').valid).toBe(true);
    expect(validateThorAddress('thor1bad')).toEqual({ valid: false, error: 'Invalid THORChain address format' });
    expect(validateThorAddress('cosmos158qequwhhnggm4ch4psv55yqpxsugf67n62dy2').valid).toBe(false);
  });
});
