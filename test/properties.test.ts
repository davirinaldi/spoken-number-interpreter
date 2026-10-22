import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { grayProduct } from '../src/gray.js';
import { analyze, interpretations } from '../src/interpret.js';
import { isValidPhone } from '../src/phone.js';
import { tokenize } from '../src/tokenize.js';

const digit = fc.integer({ min: 0, max: 9 }).map(String);
const digits = (count: number) => fc.array(digit, { minLength: count, maxLength: count }).map((d) => d.join(''));

const greekPhone = fc.oneof(
  digits(9).map((rest) => `2${rest}`),
  digits(8).map((rest) => `69${rest}`),
  digits(9).map((rest) => `00302${rest}`),
  digits(8).map((rest) => `003069${rest}`),
);

/** A tape of arbitrary choices that drives `speak` deterministically. */
const tape = fc.array(fc.nat(), { minLength: 1, maxLength: 40 });

/**
 * Every way a caller might pronounce a chunk of one to three digits such that
 * the chunk is still one of the readings: whole, digit by digit, or split into
 * the spoken atoms that the interpreter is expected to join back together.
 */
function spokenForms(chunk: string): string[][] {
  const forms: string[][] = [[chunk]];
  if (chunk.length > 1) {
    forms.push(chunk.split(''));
  }
  if (chunk.startsWith('0')) {
    return forms;
  }

  if (chunk.length === 2) {
    const [tens, unit] = [chunk.charAt(0), chunk.charAt(1)];
    if (tens !== '1' && unit !== '0') {
      forms.push([`${tens}0`, unit]); // "36" spoken as "30 6"
    }
    return forms;
  }

  if (chunk.length === 3) {
    const hundred = `${chunk.charAt(0)}00`;
    const rest = chunk.slice(1);
    const [tens, unit] = [chunk.charAt(1), chunk.charAt(2)];
    if (rest === '00') {
      return forms;
    }
    if (tens === '0') {
      forms.push([hundred, unit]); // "705" spoken as "700 5"
      return forms;
    }
    forms.push([hundred, rest]); // "724" spoken as "700 24", "714" as "700 14"
    if (tens !== '1' && unit !== '0') {
      forms.push([hundred, `${tens}0`, unit]); // "700 20 4"
      forms.push([`${chunk.charAt(0)}${tens}0`, unit]); // "720 4"
    }
  }
  return forms;
}

/** Cuts the number into chunks of 1 to 3 digits and speaks each chunk one of the faithful ways. */
function speak(number: string, choices: readonly number[]): string[] {
  let cursor = 0;
  const pick = (options: number) => (choices[cursor++ % choices.length] ?? 0) % options;

  const tokens: string[] = [];
  let position = 0;
  while (position < number.length) {
    const length = Math.min(1 + pick(3), number.length - position);
    const chunk = number.slice(position, position + length);
    position += length;
    const forms = spokenForms(chunk);
    tokens.push(...(forms[pick(forms.length)] ?? [chunk]));
  }
  return tokens;
}

const token = fc.oneof(
  { weight: 4, arbitrary: fc.integer({ min: 0, max: 999 }).map(String) },
  { weight: 1, arbitrary: fc.constantFrom('0', '00', '05', '007', '000') },
);
const tokenList = fc.array(token, { minLength: 1, maxLength: 6 });

describe('round trip', () => {
  it('finds the original phone number among the interpretations of any spoken form of it', () => {
    fc.assert(
      fc.property(greekPhone, tape, (phone, choices) => {
        expect(isValidPhone(phone)).toBe(true);
        const tokens = tokenize(speak(phone, choices).join(' '));
        const candidates = [...interpretations(analyze(tokens))];
        expect(candidates).toContain(phone);
      }),
      { numRuns: 500 },
    );
  });
});

describe('enumeration invariants', () => {
  it('lists the literal reading first, has no duplicates and matches the count', () => {
    fc.assert(
      fc.property(tokenList, (tokens) => {
        const analysis = analyze(tokens);
        const candidates = [...interpretations(analysis)];

        expect(candidates[0]).toBe(tokens.join(''));
        expect(candidates).toHaveLength(analysis.count);
        expect(new Set(candidates).size).toBe(candidates.length);
        expect(analysis.count).toBe(analysis.regions.reduce((product, region) => product * region.readings.length, 1));
      }),
      { numRuns: 300 },
    );
  });

  it('changes exactly one region between consecutive interpretations', () => {
    fc.assert(
      fc.property(tokenList, (tokens) => {
        const analysis = analyze(tokens);
        const indexLists = analysis.regions.map((region) => region.readings.map((_, i) => i));
        const tuples = [...grayProduct(indexLists)];
        const candidates = [...interpretations(analysis)];

        tuples.forEach((tuple, i) => {
          const spelled = tuple.map((index, region) => analysis.regions[region]?.readings[index]).join('');
          expect(candidates[i]).toBe(spelled);
          if (i > 0) {
            const changed = tuple.filter((index, region) => index !== tuples[i - 1]?.[region]);
            expect(changed).toHaveLength(1);
          }
        });
      }),
      { numRuns: 300 },
    );
  });
});
