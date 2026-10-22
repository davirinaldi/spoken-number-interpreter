import { canJoin, decompose, type Atom } from './atoms.js';
import { binaryGray, grayProduct } from './gray.js';

/**
 * A maximal run of atoms in which every neighbour pair may join. Regions are
 * independent of each other, so the interpretations of the whole input are
 * the product of the readings of each region.
 */
export interface Region {
  /** Input tokens covered by the region, in order. */
  readonly tokens: readonly string[];
  /** Every reading of the region; the first one is the literal reading. */
  readonly readings: readonly string[];
}

export interface Analysis {
  readonly tokens: readonly string[];
  readonly regions: readonly Region[];
  /** The tokens concatenated as typed. Always the first interpretation. */
  readonly literal: string;
  /** How many interpretations exist. Available without enumerating them. */
  readonly count: number;
}

interface PlacedAtom {
  readonly atom: Atom;
  readonly tokenIndex: number;
}

export function analyze(tokens: readonly string[]): Analysis {
  const placed = tokens.flatMap((token, tokenIndex) =>
    decompose(token).map((atom): PlacedAtom => ({ atom, tokenIndex })),
  );
  const regions = splitIntoRuns(placed).map((run) => buildRegion(run, tokens));
  return {
    tokens,
    regions,
    literal: tokens.join(''),
    count: regions.reduce((product, region) => product * region.readings.length, 1),
  };
}

/** Regions with more than one reading, i.e. the places where the input is ambiguous. */
export function ambiguities(analysis: Analysis): Region[] {
  return analysis.regions.filter((region) => region.readings.length > 1);
}

/**
 * Lazily yields every interpretation, literal first, in reflected Gray
 * order: each interpretation changes the reading of exactly one region
 * relative to the previous one.
 */
export function* interpretations(analysis: Analysis): Generator<string, void, undefined> {
  const readingLists = analysis.regions.map((region) => region.readings);
  for (const readings of grayProduct(readingLists)) {
    yield readings.join('');
  }
}

/** Splits the atom sequence at every gap whose neighbours can never join. */
function splitIntoRuns(placed: readonly PlacedAtom[]): PlacedAtom[][] {
  const runs: PlacedAtom[][] = [];
  let run: PlacedAtom[] = [];
  for (const current of placed) {
    const previous = run.at(-1);
    if (previous !== undefined && !canJoin(previous.atom, current.atom)) {
      runs.push(run);
      run = [];
    }
    run.push(current);
  }
  if (run.length > 0) {
    runs.push(run);
  }
  return runs;
}

/**
 * A region with n atoms has n - 1 gaps, and each gap is either a cut between
 * two numbers or a join inside one number. Every combination is grammatical,
 * so the region has 2^(n-1) readings, indexed by a bit mask of cut gaps.
 *
 * Readings are listed starting from the literal mask (cuts exactly at token
 * boundaries) and walking the masks in Gray order, so the literal reading
 * comes first and consecutive readings differ by a single cut or join.
 */
function buildRegion(run: readonly PlacedAtom[], tokens: readonly string[]): Region {
  const first = run[0];
  const last = run.at(-1);
  if (first === undefined || last === undefined) {
    throw new Error('A region must contain at least one atom.');
  }

  const atoms = run.map((placed) => placed.atom);
  const gaps = atoms.length - 1;
  let literalMask = 0;
  for (let gap = 0; gap < gaps; gap++) {
    if (run[gap]?.tokenIndex !== run[gap + 1]?.tokenIndex) {
      literalMask |= 1 << gap;
    }
  }

  const readings: string[] = [];
  for (let index = 0; index < 1 << gaps; index++) {
    readings.push(read(atoms, literalMask ^ binaryGray(index)));
  }
  return { tokens: tokens.slice(first.tokenIndex, last.tokenIndex + 1), readings };
}

/**
 * Spells the atoms as digits, cutting a new number wherever the mask has a
 * bit set. Atoms joined into one number are summed (700 + 20 + 4 = 724),
 * which is how spoken numbers compose. A literal atom never joins, so it is
 * always alone in its run and is spelled exactly as typed.
 */
function read(atoms: readonly Atom[], cutMask: number): string {
  if (atoms.length === 1) {
    return atoms[0]?.text ?? '';
  }
  let text = '';
  let value = 0;
  atoms.forEach((atom, index) => {
    const cutBefore = index > 0 && ((cutMask >> (index - 1)) & 1) === 1;
    if (cutBefore) {
      text += String(value);
      value = 0;
    }
    value += Number(atom.text);
  });
  return text + String(value);
}
