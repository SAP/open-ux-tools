export default class DataTypeMock {
    getName() {}
    static getType() {
        return new DataTypeMock();
    }
}
