/**
 * Spoken atoms are the pieces a number is pronounced with: "seven hundred",
 * "twenty", "four". A token such as "724" is spoken as three atoms, which is
 * what makes "700 24" or "700 20 4" plausible transcriptions of the same number.
 */
export type AtomKind = 'hundred' | 'tens' | 'teen' | 'unit' | 'literal';

export interface Atom {
  readonly kind: AtomKind;
  /** Digits of the atom as spoken: "700", "20", "4", "10". */
  readonly text: string;
}

/**
 * Decomposes a token of one to three digits into its spoken atoms.
 * "724" -> 700, 20, 4; "710" -> 700, 10; "705" -> 700, 5; "17" -> 17.
 *
 * A token starting with "0" ("0", "05", "007") is read digit by digit, so it is
 * kept whole as a literal atom that never joins its neighbours.
 */
export function decompose(token: string): Atom[] {
  if (token.startsWith('0')) {
    return [{ kind: 'literal', text: token }];
  }

  const digits = token.padStart(3, '0');
  const hundreds = Number(digits[0]);
  const tens = Number(digits[1]);
  const units = Number(digits[2]);

  const atoms: Atom[] = [];
  if (hundreds > 0) {
    atoms.push({ kind: 'hundred', text: `${hundreds}00` });
  }
  if (tens === 1) {
    atoms.push({ kind: 'teen', text: `1${units}` });
    return atoms;
  }
  if (tens > 0) {
    atoms.push({ kind: 'tens', text: `${tens}0` });
  }
  if (units > 0) {
    atoms.push({ kind: 'unit', text: `${units}` });
  }
  return atoms;
}

/**
 * Which atom kinds may follow a given kind inside one spoken number.
 * This encodes the grammar [hundred] [tens] [unit] | [hundred] [teen]:
 * positions only move forward, so no position repeats and a number has
 * at most three atoms.
 */
const MAY_FOLLOW: Record<AtomKind, readonly AtomKind[]> = {
  hundred: ['tens', 'teen', 'unit'],
  tens: ['unit'],
  teen: [],
  unit: [],
  literal: [],
};

/** True when two adjacent atoms can be part of the same spoken number. */
export function canJoin(left: Atom, right: Atom): boolean {
  return MAY_FOLLOW[left.kind].includes(right.kind);
}
