export type HashMapKeyComparator<K> = (keyA: K, keyB: K) => boolean;

export class HashMap<Key, Value> {
    private readonly keyValueMap: Map<Key, Value>;

    constructor(private readonly keyComparator: HashMapKeyComparator<Key>) {
        this.keyValueMap = new Map();
    }

    set(key: Key, value: Value): this {
        const existingKey = this.findKey(key);
        if (existingKey) {
            this.keyValueMap.set(existingKey, value);
        } else {
            this.keyValueMap.set(key, value);
        }
        return this;
    }

    has(key: Key): boolean {
        return !!this.findKey(key);
    }

    get(key: Key): Value | undefined {
        const existingKey = this.findKey(key);
        if (existingKey) {
            return this.keyValueMap.get(existingKey);
        }
        return undefined;
    }

    entries(): MapIterator<[Key, Value]> {
        return this.keyValueMap.entries();
    }

    keys(): MapIterator<Key> {
        return this.keyValueMap.keys();
    }

    map<OutKey, OutValue>(
        entryFactory: (entry: [Key, Value]) => [OutKey, OutValue],
        keyComparator: HashMapKeyComparator<OutKey>
    ): HashMap<OutKey, OutValue> {
        return HashMap.fromEntries(Array.from(this.entries()).map(entryFactory), keyComparator);
    }

    private findKey(targetKey: Key): Key | undefined {
        for (let [key] of this.keyValueMap) {
            if (this.keyComparator(key, targetKey)) {
                return key;
            }
        }
        return undefined;
    }

    static fromEntries<Key, Value>(
        entries: [Key, Value][],
        keyComparator: HashMapKeyComparator<Key>
    ): HashMap<Key, Value> {
        const hashMap = new HashMap<Key, Value>(keyComparator);
        for (const [key, value] of entries) {
            hashMap.set(key, value);
        }
        return hashMap;
    }
}
