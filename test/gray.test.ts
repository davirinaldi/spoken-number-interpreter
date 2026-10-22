import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { binaryGray, grayProduct } from '../src/gray.js';

/** Positions whose value differs between two tuples. */
function changedPositions(a: readonly number[], b: readonly number[]): number[] {
  return a.flatMap((value, i) => (value === b[i] ? [] : [i]));
}

describe('binaryGray', () => {
  it('produces the reflected sequence 00 01 11 10', () => {
    expect([0, 1, 2, 3].map(binaryGray)).toEqual([0b00, 0b01, 0b11, 0b10]);
  });
});

describe('grayProduct', () => {
  it('yields a single empty tuple for no lists', () => {
    expect([...grayProduct([])]).toEqual([[]]);
  });

  it('walks two binary positions in reflected order', () => {
    expect([...grayProduct([[0, 1], [0, 1]])]).toEqual([
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ]);
  });

  it('starts from the first element of every list', () => {
    const [first] = grayProduct([['a', 'b'], ['x', 'y', 'z', 'w'], ['p', 'q']]);
    expect(first).toEqual(['a', 'x', 'p']);
  });

  it('visits every combination once, changing one position by one step each time', () => {
    const radices = fc.array(fc.integer({ min: 1, max: 4 }), { maxLength: 5 });
    fc.assert(
      fc.property(radices, (sizes) => {
        const lists = sizes.map((size) => Array.from({ length: size }, (_, i) => i));
        const tuples = [...grayProduct(lists)];

        expect(tuples.length).toBe(sizes.reduce((product, size) => product * size, 1));
        expect(new Set(tuples.map((t) => t.join(','))).size).toBe(tuples.length);
        expect(tuples[0]).toEqual(sizes.map(() => 0));
        for (let i = 1; i < tuples.length; i++) {
          const changed = changedPositions(tuples[i - 1] ?? [], tuples[i] ?? []);
          expect(changed).toHaveLength(1);
          const position = changed[0] ?? 0;
          expect(Math.abs((tuples[i]?.[position] ?? 0) - (tuples[i - 1]?.[position] ?? 0))).toBe(1);
        }
      }),
    );
  });
});
