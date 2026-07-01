export default class EventMock<T = object> {
    constructor(private readonly parameters: T) {}

    getParameter<K extends keyof T>(key: K): T[K] {
        return this.parameters[key];
    }
}
