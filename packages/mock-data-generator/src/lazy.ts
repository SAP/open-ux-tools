/**
 * A value created on first use and kept afterwards. A creation that throws is not kept, so the next call
 * tries again and reports the failure again.
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
