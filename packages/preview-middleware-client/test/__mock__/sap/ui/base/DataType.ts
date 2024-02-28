export const getNameMock = jest.fn();

export default class DataTypeMock {
    getName(): string | undefined {
        return getNameMock();
    }
    static getType() {
        return new DataTypeMock();
    }
}