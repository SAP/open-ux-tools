/**
 * A value created on first use and kept afterwards; a creation that throws is retried on the next call.
 *
 * @param create creates the value
 * @returns a function that returns the value, creating it on the first call
 */
export function lazy<Value>(create: () => Value): () => Value {
    let created: { value: Value } | undefined;
    return (): Value => {
        created ??= { value: create() };
        return created.value;
    };
}
