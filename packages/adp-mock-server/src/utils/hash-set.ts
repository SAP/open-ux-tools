export type HashSetComparator<V> = (valueA: V, valueB: V) => boolean;

export class HashSet<Value> {
    private valuesList: Value[] = [];

    constructor(private readonly comparator: HashSetComparator<Value>) {}

    add(value: Value): this {
        if (!this.has(value)) {
            this.valuesList.push(value);
        }
        return this;
    }

    has(value: Value): boolean {
        return this.valuesList.some((existingValue) => this.comparator(value, existingValue));
    }

    values(): Value[] {
        return this.valuesList.concat();
    }
}
