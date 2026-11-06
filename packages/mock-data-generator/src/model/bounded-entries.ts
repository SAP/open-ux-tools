/**
 * Record an entry as the most recent one in an insertion-ordered map and drop the oldest entry once the map
 * holds more than `maximumEntries`.
 *
 * @param entries the map, oldest entry first
 * @param key the entry key
 * @param value the entry value
 * @param maximumEntries entries kept
 */
export function rememberLatest<Value>(
    entries: Map<string, Value>,
    key: string,
    value: Value,
    maximumEntries: number
): void {
    entries.delete(key);
    entries.set(key, value);
    if (entries.size > maximumEntries) {
        const oldest = entries.keys().next();
        if (!oldest.done) {
            entries.delete(oldest.value);
        }
    }
}
