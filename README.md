# Spoken Number Interpreter

Command line application for the "Natural Numbers Interpretation" assignment.
It takes a sequence of numbers as a speech recognizer would produce them
(one to three digits each, separated by spaces), prints the number they form,
states whether it is a valid Greek phone number and lists every alternative
interpretation caused by spoken-number ambiguities, such as `20 5` meaning
either `205` or `25`.

## Requirements

- Node.js 22 or later (developed on Node.js 24; continuous integration runs on Node.js 22 LTS)
- npm

The application has no runtime dependencies. TypeScript, tsx, Vitest and
fast-check are development dependencies only.

## Install, run, test, build

```sh
npm install

npm start                              # interactive: asks for numbers until an empty line
npm start -- "2 10 69 30 6 6 4"        # direct: interprets the given numbers and exits
npm start -- --explain "2 10 69 30 6 6 4"

npm test                               # unit, golden and property-based tests
npm run typecheck                      # strict TypeScript check of sources and tests
npm run build                          # compiles to dist/; run with: node dist/main.js "2 10 69 30 6 6 4"
```

### Options

| Option       | Effect                                                         |
| ------------ | -------------------------------------------------------------- |
| `--explain`  | Shows which token groups are ambiguous and their readings      |
| `--json`     | Prints the result as JSON                                      |
| `--limit N`  | Prints at most N interpretations (the total count is still shown) |
| `-h, --help` | Shows the usage                                                |

Exit codes: `0` success, `1` invalid input (empty, non-numeric token, token with
more than three digits), `2` invalid command line options. In interactive mode
an invalid line prints the error and asks again.

## Examples

```
$ npm start -- "2 10 69 30 6 6 4"
Output: 2106930664
Phone number: VALID

Interpretations: 4
  1. 2106930664   VALID
  2. 210693664    INVALID
  3. 2106093664   VALID
  4. 21060930664  INVALID
```

```
$ npm start -- --explain "0 0 30 69 700 24 1 3 50 2"
Output: 0030697002413502
Phone number: INVALID

Ambiguities: 3
  69      -> 69 | 609
  700 24  -> 70024 | 724 | 7204 | 700204
  50 2    -> 502 | 52

Interpretations: 16
   1. 0030697002413502    INVALID
   2. 003069700241352     INVALID
   3. 0030697241352       INVALID
   4. 00306972413502      VALID
   5. 003069720413502     INVALID
   6. 00306972041352      VALID
   7. 0030697002041352    INVALID
   8. 00306970020413502   INVALID
   9. 003060970020413502  INVALID
  10. 00306097002041352   INVALID
  11. 003060972041352     INVALID
  12. 0030609720413502    INVALID
  13. 003060972413502     INVALID
  14. 00306097241352      INVALID
  15. 0030609700241352    INVALID
  16. 00306097002413502   INVALID
```

```
$ npm start -- --json "20 5"
{
  "input": "20 5",
  "number": "205",
  "valid": false,
  "count": 2,
  "interpretations": [
    {
      "number": "205",
      "valid": false
    },
    {
      "number": "25",
      "valid": false
    }
  ],
  "ambiguities": [
    {
      "tokens": [
        "20",
        "5"
      ],
      "readings": [
        "205",
        "25"
      ]
    }
  ]
}
```

```
$ npm start -- "2 abc 4"
Error: Invalid token "abc": expected 1 to 3 digits.
```

## Design decisions

**Spoken atoms.** Each token is decomposed into the pieces it is pronounced
with: a hundred (100-900), a block from 10 to 19 (indivisible), a tens (20-90)
and a unit (1-9). `724` becomes `700 20 4`, `710` becomes `700 10`. A token
that starts with `0` (`0`, `05`) is read digit by digit, so it is kept whole as
a literal atom. See `src/atoms.ts`.

**Joining grammar.** Two neighbouring atoms can belong to the same number only
in the order `[hundred] [tens] [unit]` or `[hundred] [teen]`, with no position
repeated. The grammar is a table of which atom kind may follow which; the
positions only move forward, so a number never has more than three atoms.

**Regions.** The atom sequence is cut wherever two neighbours can never join.
Each maximal run of joinable atoms is a region, and regions are independent:
the interpretations of the input are the Cartesian product of the readings of
every region, so the total count is a product and is known without
enumerating anything. A region with n atoms has n - 1 gaps, each of which is
either a cut between two numbers or a join inside one number, and every
combination is grammatical, giving 2^(n-1) readings (at most 4). Readings
are spelled by summing joined atoms (700 + 20 + 4 = 724), which is how spoken
numbers compose. See `src/interpret.ts`.

**Ordering.** The literal reading (tokens concatenated as typed) always comes
first, in every region and therefore overall. The product is enumerated in
reflected Gray order (`src/gray.ts`): every interpretation differs from the
previous one in exactly one region, which keeps the list predictable, puts the
most literal readings first and reproduces the order of the assignment's
examples. Within a region the readings also follow a Gray walk over the cut
mask, starting from the literal mask, so consecutive readings differ by a
single cut or join.

**Laziness and uniqueness.** Interpretations are produced by a generator and
are never stored, so `--limit` costs only what it prints. There are no
duplicates by construction: two readings of the same region always differ at a
position inside their common length, so the concatenation is injective. The
property-based tests check this.

**Complexity.** Analysis is linear in the number of atoms (at most three per
token). Each interpretation costs O(regions) to produce and the enumeration
keeps O(regions) state. The number of interpretations is the product of the
region sizes, bounded by 4^tokens in theory and small for phone numbers in
practice; the count is exact up to 2^53.

**Phone validation.** Rules are data, not code: a list of (length, allowed
prefixes) shapes. The Greek rule is `10 digits starting with 2 or 69` and
`14 digits starting with 00302 or 003069`. Another country is another shape
list passed to the same validator. See `src/phone.ts`.

**Assumptions.**
- A token with a leading zero (`05`) is a literal digit string and never joins.
- `0` never joins its neighbours: `20 0` is `200`, never `20`.
- `2 100` is read as `2100`; the "two hundred" reading of a unit followed by
  `100` is out of scope.
- Tokens are separated by any run of whitespace; each has one to three digits.

## Project layout

```
src/main.ts        process entry point
src/cli.ts         option parsing, direct and interactive modes, exit codes
src/format.ts      report building, text and JSON rendering
src/tokenize.ts    input validation
src/atoms.ts       spoken atoms and the joining grammar
src/interpret.ts   regions, readings, lazy enumeration and counting
src/gray.ts        reflected Gray code over a Cartesian product
src/phone.ts       pluggable phone number rules
test/              unit, golden (assignment examples), property-based and CLI tests
```
