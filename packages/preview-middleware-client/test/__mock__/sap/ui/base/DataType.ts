export default class DataTypeMock {
    getName(): string | undefined {
        return undefined;
    }
    static getType() {
        return new DataTypeMock();
    }
}