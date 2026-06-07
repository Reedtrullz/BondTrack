import { describe, expect, it } from 'vitest';
import {
  generateBondMemo,
  generateUnbondMemo,
  parseRuneAmountToBaseUnits,
  validateBondAmount,
  validateBondMemoOptions,
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

  it('preserves valid BOND memo variants for provider and operator fee boundaries', () => {
    const node = 'thor16xxh3km6dxka636qg6q7e3us5vlgvhrhjgw245';
    const provider = 'thor158qequwhhnggm4ch4psv55yqpxsugf67n62dy2';

    expect(generateBondMemo(node)).toBe(`BOND:${node}`);
    expect(generateBondMemo(node, provider)).toBe(`BOND:${node}:${provider}:0`);
    expect(generateBondMemo(node, provider, '')).toBe(`BOND:${node}:${provider}:0`);
    expect(generateBondMemo(node, provider, '0')).toBe(`BOND:${node}:${provider}:0`);
    expect(generateBondMemo(node, provider, '10000')).toBe(`BOND:${node}:${provider}:10000`);
  });

  it('rejects BOND operator fees without a valid provider address', () => {
    expect(validateBondMemoOptions('', '1')).toEqual({
      valid: false,
      error: 'Provider address is required when operator fee is set',
    });
    expect(validateBondMemoOptions('   ', '1000')).toEqual({
      valid: false,
      error: 'Provider address is required when operator fee is set',
    });
    expect(validateBondMemoOptions('thor1bad', '1000')).toEqual({
      valid: false,
      error: 'Provider address must be a valid THORChain address',
    });
  });

  it('rejects malformed or out-of-range BOND operator fees', () => {
    const provider = 'thor158qequwhhnggm4ch4psv55yqpxsugf67n62dy2';

    expect(validateBondMemoOptions(provider, '10001')).toEqual({
      valid: false,
      error: 'Operator fee must be between 0 and 10000 basis points',
    });
    expect(validateBondMemoOptions(provider, '-1')).toEqual({
      valid: false,
      error: 'Operator fee must be a whole number between 0 and 10000 basis points',
    });
    expect(validateBondMemoOptions(provider, '12.5')).toEqual({
      valid: false,
      error: 'Operator fee must be a whole number between 0 and 10000 basis points',
    });
    expect(validateBondMemoOptions(provider, 'abc')).toEqual({
      valid: false,
      error: 'Operator fee must be a whole number between 0 and 10000 basis points',
    });
    expect(validateBondMemoOptions(provider, '1000abc')).toEqual({
      valid: false,
      error: 'Operator fee must be a whole number between 0 and 10000 basis points',
    });
    expect(validateBondMemoOptions(provider, '   ')).toEqual({
      valid: false,
      error: 'Operator fee must be a whole number between 0 and 10000 basis points',
    });
  });

  it('allows leading-zero BOND operator fees and memo generation preserves the entered digits', () => {
    const node = 'thor16xxh3km6dxka636qg6q7e3us5vlgvhrhjgw245';
    const provider = 'thor158qequwhhnggm4ch4psv55yqpxsugf67n62dy2';

    expect(validateBondMemoOptions(provider, '001')).toEqual({ valid: true });
    expect(generateBondMemo(node, provider, '001')).toBe(`BOND:${node}:${provider}:001`);
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
