/** Binary reflected Gray code: consecutive values differ in exactly one bit. */
export function binaryGray(index: number): number {
  return index ^ (index >> 1);
}

/**
 * Cartesian product of the given lists in reflected Gray order: the first
 * tuple takes the first element of every list, and each following tuple
 * differs from the previous one in exactly one position, by one step.
 *
 * The last list changes fastest. Whenever a position lands on an odd index
 * the positions after it run backwards, which is what keeps the sequence
 * reflected instead of wrapping around.
 */
export function* grayProduct<T>(lists: ReadonlyArray<readonly T[]>): Generator<readonly T[], void, undefined> {
  const picked: T[] = [];

  function* walk(position: number, reversed: boolean): Generator<readonly T[], void, undefined> {
    const list = lists[position];
    if (list === undefined) {
      yield [...picked];
      return;
    }
    const ordered = reversed ? list.slice().reverse() : list;
    for (const [step, item] of ordered.entries()) {
      const index = reversed ? list.length - 1 - step : step;
      picked[position] = item;
      yield* walk(position + 1, reversed !== (index % 2 === 1));
    }
  }

  yield* walk(0, false);
}
