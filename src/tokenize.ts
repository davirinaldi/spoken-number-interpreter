/** Raised when the raw input cannot be turned into a token sequence. */
export class InputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InputError';
  }
}

const TOKEN_PATTERN = /^\d{1,3}$/;

/**
 * Splits raw user input into number tokens of one to three digits.
 * Any run of whitespace separates tokens; surrounding whitespace is ignored.
 */
export function tokenize(input: string): string[] {
  const trimmed = input.trim();
  if (trimmed === '') {
    throw new InputError('Input is empty. Enter numbers separated by spaces, e.g. "2 10 69 30 6 6 4".');
  }

  const tokens = trimmed.split(/\s+/);
  for (const token of tokens) {
    if (!/^\d+$/.test(token)) {
      throw new InputError(`Invalid token "${token}": expected 1 to 3 digits.`);
    }
    if (!TOKEN_PATTERN.test(token)) {
      throw new InputError(`Invalid token "${token}": numbers may have at most 3 digits.`);
    }
  }
  return tokens;
}
