import { ambiguities, analyze, interpretations, type Region } from './interpret.js';
import { isValidPhone, type PhoneRule } from './phone.js';

export interface Candidate {
  readonly number: string;
  readonly valid: boolean;
}

export interface Report {
  readonly input: string;
  /** Base level: the tokens concatenated as typed. */
  readonly number: string;
  readonly valid: boolean;
  /** Total number of interpretations, even when fewer are listed. */
  readonly count: number;
  readonly interpretations: readonly Candidate[];
  readonly ambiguities: readonly Region[];
}

export function buildReport(tokens: readonly string[], rule: PhoneRule, limit = Infinity): Report {
  const analysis = analyze(tokens);
  const listed = take(interpretations(analysis), limit);
  return {
    input: tokens.join(' '),
    number: analysis.literal,
    valid: isValidPhone(analysis.literal, rule),
    count: analysis.count,
    interpretations: listed.map((number) => ({ number, valid: isValidPhone(number, rule) })),
    ambiguities: ambiguities(analysis),
  };
}

export function formatText(report: Report, options: { explain: boolean }): string {
  const lines = [`Output: ${report.number}`, `Phone number: ${verdict(report.valid)}`, ''];

  if (options.explain) {
    lines.push(...formatAmbiguities(report.ambiguities), '');
  }

  const shown = report.interpretations;
  const heading = shown.length < report.count ? ` (showing first ${shown.length})` : '';
  lines.push(`Interpretations: ${report.count}${heading}`);

  const indexWidth = String(shown.length).length;
  const numberWidth = Math.max(0, ...shown.map((candidate) => candidate.number.length));
  shown.forEach((candidate, index) => {
    const position = String(index + 1).padStart(indexWidth);
    lines.push(`  ${position}. ${candidate.number.padEnd(numberWidth)}  ${verdict(candidate.valid)}`);
  });
  return lines.join('\n');
}

export function formatJson(report: Report): string {
  return JSON.stringify(report, null, 2);
}

function formatAmbiguities(regions: readonly Region[]): string[] {
  if (regions.length === 0) {
    return ['Ambiguities: none'];
  }
  const labels = regions.map((region) => region.tokens.join(' '));
  const labelWidth = Math.max(0, ...labels.map((label) => label.length));
  return [
    `Ambiguities: ${regions.length}`,
    ...regions.map((region, index) => `  ${(labels[index] ?? '').padEnd(labelWidth)}  -> ${region.readings.join(' | ')}`),
  ];
}

function verdict(valid: boolean): string {
  return valid ? 'VALID' : 'INVALID';
}

function take<T>(items: Iterable<T>, limit: number): T[] {
  const taken: T[] = [];
  for (const item of items) {
    if (taken.length >= limit) {
      break;
    }
    taken.push(item);
  }
  return taken;
}
