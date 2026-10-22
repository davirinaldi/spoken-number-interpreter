import { describe, expect, it } from 'vitest';
import { InputError, tokenize } from '../src/tokenize.js';

describe('tokenize', () => {
  it('splits numbers separated by spaces', () => {
    expect(tokenize('2 10 69 30 6 6 4')).toEqual(['2', '10', '69', '30', '6', '6', '4']);
  });

  it('ignores surrounding whitespace and accepts runs of whitespace', () => {
    expect(tokenize('  30   2\t5  58 \n')).toEqual(['30', '2', '5', '58']);
  });

  it('keeps leading zeros as typed', () => {
    expect(tokenize('0 05 007')).toEqual(['0', '05', '007']);
  });

  it('rejects empty input', () => {
    expect(() => tokenize('')).toThrow(InputError);
    expect(() => tokenize('   ')).toThrow(/empty/);
  });

  it('rejects tokens that are not digits', () => {
    expect(() => tokenize('2 abc 4')).toThrow(/Invalid token "abc"/);
    expect(() => tokenize('-5')).toThrow(InputError);
    expect(() => tokenize('2.5')).toThrow(InputError);
    expect(() => tokenize('2,5')).toThrow(InputError);
  });

  it('rejects tokens with more than three digits', () => {
    expect(() => tokenize('1234')).toThrow(/at most 3 digits/);
  });
});
