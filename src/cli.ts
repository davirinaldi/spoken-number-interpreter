import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { buildReport, formatJson, formatText } from './format.js';
import { greekPhoneRule } from './phone.js';
import { InputError, tokenize } from './tokenize.js';

export const EXIT_OK = 0;
export const EXIT_INVALID_INPUT = 1;
export const EXIT_USAGE = 2;

export interface Io {
  readonly stdin: NodeJS.ReadableStream;
  readonly stdout: { write(text: string): unknown };
  readonly stderr: { write(text: string): unknown };
}

interface Options {
  readonly json: boolean;
  readonly explain: boolean;
  readonly limit: number | undefined;
  /** Numbers given on the command line, or undefined to ask interactively. */
  readonly input: string | undefined;
  readonly help: boolean;
}

const PROMPT = 'Enter numbers separated by spaces (empty line to exit): ';

const USAGE = `Usage: npm start -- [options] [numbers...]

Interprets a sequence of spoken numbers (1 to 3 digits each, separated by
spaces), checks whether the result is a valid Greek phone number and lists
every alternative interpretation. Without numbers, asks for input interactively.

Options:
  --explain    show which token groups are ambiguous and their readings
  --json       print the result as JSON
  --limit N    print at most N interpretations
  -h, --help   show this help

Examples:
  npm start -- "2 10 69 30 6 6 4"
  npm start -- --explain "0 0 30 69 700 24 1 3 50 2"
`;

/** Runs the command line interface and resolves to the process exit code. */
export async function run(args: readonly string[], io: Io): Promise<number> {
  let options: Options;
  try {
    options = parseOptions(args);
  } catch (error) {
    io.stderr.write(`Error: ${messageOf(error)}\n\n${USAGE}`);
    return EXIT_USAGE;
  }
  if (options.help) {
    io.stdout.write(USAGE);
    return EXIT_OK;
  }
  if (options.input !== undefined) {
    return interpretLine(options.input, options, io);
  }
  return runInteractive(options, io);
}

function parseOptions(args: readonly string[]): Options {
  const { values, positionals } = parseArgs({
    args: [...args],
    allowPositionals: true,
    options: {
      json: { type: 'boolean', default: false },
      explain: { type: 'boolean', default: false },
      limit: { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });

  let limit: number | undefined;
  if (values.limit !== undefined) {
    limit = Number(values.limit);
    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error(`--limit expects a positive integer, got "${values.limit}".`);
    }
  }
  return {
    json: values.json,
    explain: values.explain,
    limit,
    input: positionals.length > 0 ? positionals.join(' ') : undefined,
    help: values.help,
  };
}

async function runInteractive(options: Options, io: Io): Promise<number> {
  const lines = createInterface({ input: io.stdin, crlfDelay: Infinity });
  let inputEnded = true;
  io.stdout.write(PROMPT);
  for await (const line of lines) {
    if (line.trim() === '') {
      inputEnded = false;
      break;
    }
    interpretLine(line, options, io);
    io.stdout.write(`\n${PROMPT}`);
  }
  lines.close();
  if (inputEnded) {
    io.stdout.write('\n');
  }
  return EXIT_OK;
}

function interpretLine(line: string, options: Options, io: Io): number {
  let tokens: string[];
  try {
    tokens = tokenize(line);
  } catch (error) {
    if (!(error instanceof InputError)) {
      throw error;
    }
    io.stderr.write(`Error: ${error.message}\n`);
    return EXIT_INVALID_INPUT;
  }

  const report = buildReport(tokens, greekPhoneRule, options.limit);
  const output = options.json ? formatJson(report) : formatText(report, { explain: options.explain });
  io.stdout.write(`${output}\n`);
  return EXIT_OK;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
