/** A phone-number rule: the number must match one of the (length, prefix) shapes. */
export interface PhoneRule {
  readonly name: string;
  readonly shapes: ReadonlyArray<{
    readonly length: number;
    readonly prefixes: readonly string[];
  }>;
}

export const greekPhoneRule: PhoneRule = {
  name: 'Greek',
  shapes: [
    { length: 10, prefixes: ['2', '69'] },
    { length: 14, prefixes: ['00302', '003069'] },
  ],
};

export function isValidPhone(digits: string, rule: PhoneRule = greekPhoneRule): boolean {
  return rule.shapes.some(
    (shape) => digits.length === shape.length && shape.prefixes.some((prefix) => digits.startsWith(prefix)),
  );
}
