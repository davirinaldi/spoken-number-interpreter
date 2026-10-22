import { describe, expect, it } from 'vitest';
import { buildReport } from '../src/format.js';
import { greekPhoneRule } from '../src/phone.js';
import { tokenize } from '../src/tokenize.js';

const report = (input: string) => buildReport(tokenize(input), greekPhoneRule);
const rows = (input: string) => report(input).interpretations.map((c) => `${c.number} ${c.valid ? 'VALID' : 'INVALID'}`);

describe('base level (PDF tables)', () => {
  it.each([
    ['30 2 5 58', '302558'],
    ['2 10 69 30 6 60 4', '21069306604'],
    ['6 97 400 23 7 40 5', '697400237405'],
  ])('prints %s as %s', (input, expected) => {
    expect(report(input).number).toBe(expected);
  });

  it.each([
    ['30 2 5 58', '302558', false],
    ['2 10 69 30 6 6 4', '2106930664', true],
    ['2 10 69 30 6 60 4', '21069306604', false],
    ['0 0 30 69 74 0 9 22 52', '00306974092252', true],
  ])('validates %s -> %s as %s', (input, expected, valid) => {
    const result = report(input);
    expect(result.number).toBe(expected);
    expect(result.valid).toBe(valid);
    expect(result.interpretations[0]).toEqual({ number: expected, valid });
  });
});

describe('advanced level (PDF examples)', () => {
  it('example 1: 2 10 6 9 30 6 6 4', () => {
    expect(rows('2 10 6 9 30 6 6 4')).toEqual(['2106930664 VALID', '210693664 INVALID']);
  });

  it('example 2: 2 10 69 30 6 6 4, in this exact order', () => {
    expect(rows('2 10 69 30 6 6 4')).toEqual([
      '2106930664 VALID',
      '210693664 INVALID',
      '2106093664 VALID',
      '21060930664 INVALID',
    ]);
  });

  it('example 3: 0 0 30 69 700 24 1 3 50 2', () => {
    const result = report('0 0 30 69 700 24 1 3 50 2');
    const listed = rows('0 0 30 69 700 24 1 3 50 2');

    expect(result.count).toBe(16);
    expect(listed).toHaveLength(16);
    expect(listed.slice(0, 2)).toEqual(['0030697002413502 INVALID', '003069700241352 INVALID']);
    expect(listed).toContain('00306972413502 VALID');
    expect(listed).toContain('00306097241352 INVALID');
    expect(result.ambiguities.map((region) => region.tokens.join(' '))).toEqual(['69', '700 24', '50 2']);
  });
});
