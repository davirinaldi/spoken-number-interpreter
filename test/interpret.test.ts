import { describe, expect, it } from 'vitest';
import { ambiguities, analyze, interpretations } from '../src/interpret.js';

const readingsOf = (input: string) => analyze(input.split(' ')).regions.map((region) => region.readings);
const all = (input: string) => [...interpretations(analyze(input.split(' ')))];

describe('regions', () => {
  it('splits "20 5" and "75" the way the assignment describes', () => {
    expect(readingsOf('20 5')).toEqual([['205', '25']]);
    expect(readingsOf('75')).toEqual([['75', '705']]);
  });

  it('keeps the literal reading first in every region', () => {
    expect(readingsOf('724')).toEqual([['724', '70024', '700204', '7204']]);
    expect(readingsOf('700 24')).toEqual([['70024', '724', '7204', '700204']]);
    expect(readingsOf('700 20 4')).toEqual([['700204', '7204', '724', '70024']]);
  });

  it('joins a hundred with a teen but never a tens with a teen', () => {
    expect(readingsOf('700 10')).toEqual([['70010', '710']]);
    expect(readingsOf('20 10')).toEqual([['20'], ['10']]);
  });

  it('never joins units to what follows them', () => {
    expect(readingsOf('6 6')).toEqual([['6'], ['6']]);
    expect(readingsOf('6 9 30')).toEqual([['6'], ['9'], ['30']]);
    expect(readingsOf('2 100')).toEqual([['2'], ['100']]);
  });

  it('treats zero and tokens with leading zeros as literal digits', () => {
    expect(readingsOf('0 5')).toEqual([['0'], ['5']]);
    expect(readingsOf('20 0')).toEqual([['20'], ['0']]);
    expect(readingsOf('05 3')).toEqual([['05'], ['3']]);
    expect(readingsOf('700 05')).toEqual([['700'], ['05']]);
  });

  it('records which tokens each region covers', () => {
    const analysis = analyze(['2', '10', '69', '30', '6', '6', '4']);
    expect(analysis.regions.map((region) => region.tokens)).toEqual([['2'], ['10'], ['69'], ['30', '6'], ['6'], ['4']]);
    expect(ambiguities(analysis).map((region) => region.tokens)).toEqual([['69'], ['30', '6']]);
  });
});

describe('interpretations', () => {
  it('counts without enumerating', () => {
    const analysis = analyze(['724', '724', '724', '724', '724']);
    expect(analysis.count).toBe(4 ** 5);
    expect(analysis.regions.map((region) => region.readings.length)).toEqual([4, 4, 4, 4, 4]);
  });

  it('starts with the literal reading and changes one region at a time', () => {
    expect(all('30 2 5 58')).toEqual(['302558', '3025508', '325508', '32558']);
  });

  it('is lazy', () => {
    const generator = interpretations(analyze(Array.from({ length: 20 }, () => '724')));
    expect(generator.next().value).toBe('724'.repeat(20));
    expect(generator.next().value).toBe('724'.repeat(19) + '70024');
    generator.return();
  });

  it('has a single interpretation when nothing can join', () => {
    expect(all('1 2 3')).toEqual(['123']);
    expect(analyze(['1', '2', '3']).count).toBe(1);
  });
});
