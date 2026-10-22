import { describe, expect, it } from 'vitest';
import { canJoin, decompose, type Atom, type AtomKind } from '../src/atoms.js';

const atom = (kind: AtomKind, text = ''): Atom => ({ kind, text });

describe('decompose', () => {
  it.each([
    ['7', ['unit:7']],
    ['70', ['tens:70']],
    ['17', ['teen:17']],
    ['10', ['teen:10']],
    ['69', ['tens:60', 'unit:9']],
    ['100', ['hundred:100']],
    ['700', ['hundred:700']],
    ['705', ['hundred:700', 'unit:5']],
    ['710', ['hundred:700', 'teen:10']],
    ['719', ['hundred:700', 'teen:19']],
    ['720', ['hundred:700', 'tens:20']],
    ['724', ['hundred:700', 'tens:20', 'unit:4']],
  ])('decomposes %s into spoken atoms', (token, expected) => {
    expect(decompose(token).map((a) => `${a.kind}:${a.text}`)).toEqual(expected);
  });

  it.each(['0', '00', '05', '007', '000'])('keeps %s as a single literal atom', (token) => {
    expect(decompose(token)).toEqual([{ kind: 'literal', text: token }]);
  });
});

describe('canJoin', () => {
  const kinds: AtomKind[] = ['hundred', 'tens', 'teen', 'unit', 'literal'];
  const allowed = new Set(['hundred>tens', 'hundred>teen', 'hundred>unit', 'tens>unit']);

  it('allows exactly the pairs of the [hundred] [tens] [unit] | [hundred] [teen] grammar', () => {
    for (const left of kinds) {
      for (const right of kinds) {
        expect(canJoin(atom(left), atom(right)), `${left} > ${right}`).toBe(allowed.has(`${left}>${right}`));
      }
    }
  });
});
