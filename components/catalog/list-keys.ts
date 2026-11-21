export function keyedItems<T>(items: readonly T[], identity: (item: T) => string): [string, T][] {
  const occurrences = new Map<string, number>();
  return items.map((item) => {
    const id = identity(item);
    const occurrence = occurrences.get(id) ?? 0;
    occurrences.set(id, occurrence + 1);
    return [JSON.stringify([id, occurrence]), item];
  });
}
