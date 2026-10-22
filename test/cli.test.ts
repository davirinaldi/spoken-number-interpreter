import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { EXIT_INVALID_INPUT, EXIT_OK, EXIT_USAGE, run } from '../src/cli.js';

function fakeIo(stdinLines: readonly string[] = []) {
  let stdout = '';
  let stderr = '';
  const io = {
    stdin: Readable.from(stdinLines.map((line) => `${line}\n`)),
    stdout: { write: (text: string) => (stdout += text) },
    stderr: { write: (text: string) => (stderr += text) },
  };
  return { io, stdout: () => stdout, stderr: () => stderr };
}

const PROMPT = 'Enter numbers separated by spaces (empty line to exit): ';

describe('direct mode', () => {
  it('prints the base level output followed by the numbered interpretations', async () => {
    const { io, stdout } = fakeIo();
    expect(await run(['2 10 69 30 6 6 4'], io)).toBe(EXIT_OK);
    expect(stdout()).toBe(
      [
        'Output: 2106930664',
        'Phone number: VALID',
        '',
        'Interpretations: 4',
        '  1. 2106930664   VALID',
        '  2. 210693664    INVALID',
        '  3. 2106093664   VALID',
        '  4. 21060930664  INVALID',
        '',
      ].join('\n'),
    );
  });

  it('accepts the numbers as separate arguments', async () => {
    const quoted = fakeIo();
    const separate = fakeIo();
    await run(['30 2 5 58'], quoted.io);
    await run(['30', '2', '5', '58'], separate.io);
    expect(separate.stdout()).toBe(quoted.stdout());
  });

  it('explains where the ambiguities are', async () => {
    const { io, stdout } = fakeIo();
    await run(['--explain', '2 10 69 30 6 6 4'], io);
    expect(stdout()).toContain('Ambiguities: 2\n  69    -> 69 | 609\n  30 6  -> 306 | 36\n');
  });

  it('reports when there is nothing ambiguous', async () => {
    const { io, stdout } = fakeIo();
    await run(['--explain', '1 2 3'], io);
    expect(stdout()).toContain('Ambiguities: none');
  });

  it('limits the listed interpretations but keeps the total count', async () => {
    const { io, stdout } = fakeIo();
    await run(['--limit', '2', '0 0 30 69 700 24 1 3 50 2'], io);
    expect(stdout()).toContain('Interpretations: 16 (showing first 2)');
    expect(stdout()).toContain('  2. 003069700241352   INVALID');
    expect(stdout()).not.toContain('  3. ');
  });

  it('prints JSON', async () => {
    const { io, stdout } = fakeIo();
    await run(['--json', '2 10 6 9 30 6 6 4'], io);
    expect(JSON.parse(stdout())).toEqual({
      input: '2 10 6 9 30 6 6 4',
      number: '2106930664',
      valid: true,
      count: 2,
      interpretations: [
        { number: '2106930664', valid: true },
        { number: '210693664', valid: false },
      ],
      ambiguities: [{ tokens: ['30', '6'], readings: ['306', '36'] }],
    });
  });

  it('prints the usage with --help', async () => {
    const { io, stdout } = fakeIo();
    expect(await run(['--help'], io)).toBe(EXIT_OK);
    expect(stdout()).toContain('Usage:');
  });
});

describe('errors', () => {
  it('fails with exit code 1 on invalid input', async () => {
    const { io, stdout, stderr } = fakeIo();
    expect(await run(['2 abc 4'], io)).toBe(EXIT_INVALID_INPUT);
    expect(stderr()).toBe('Error: Invalid token "abc": expected 1 to 3 digits.\n');
    expect(stdout()).toBe('');
  });

  it('fails with exit code 1 on empty input', async () => {
    const { io } = fakeIo();
    expect(await run(['   '], io)).toBe(EXIT_INVALID_INPUT);
  });

  it('fails with exit code 2 on invalid options', async () => {
    const limit = fakeIo();
    expect(await run(['--limit', '0', '1 2'], limit.io)).toBe(EXIT_USAGE);
    expect(limit.stderr()).toContain('--limit expects a positive integer');
    expect(limit.stderr()).toContain('Usage:');

    const unknown = fakeIo();
    expect(await run(['--bogus', '1 2'], unknown.io)).toBe(EXIT_USAGE);
  });
});

describe('interactive mode', () => {
  it('asks for numbers until an empty line, reporting errors without quitting', async () => {
    const { io, stdout, stderr } = fakeIo(['2 10 6 9 30 6 6 4', 'abc', '20 5', '']);
    expect(await run([], io)).toBe(EXIT_OK);

    expect(stdout().split(PROMPT)).toHaveLength(5);
    expect(stdout()).toContain('Output: 2106930664');
    expect(stdout()).toContain('Output: 205');
    expect(stdout().endsWith(PROMPT)).toBe(true);
    expect(stderr()).toBe('Error: Invalid token "abc": expected 1 to 3 digits.\n');
  });

  it('applies the flags to every answer and stops cleanly at end of input', async () => {
    const { io, stdout } = fakeIo(['75']);
    expect(await run(['--json'], io)).toBe(EXIT_OK);
    expect(stdout()).toContain('"number": "75"');
    expect(stdout().endsWith(`${PROMPT}\n`)).toBe(true);
  });

  it('quits with exit code 0 when there is no input at all', async () => {
    const { io, stdout } = fakeIo();
    expect(await run([], io)).toBe(EXIT_OK);
    expect(stdout()).toBe(`${PROMPT}\n`);
  });
});
