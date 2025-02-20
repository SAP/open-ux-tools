export default class UIComponentMock {
    getRootControl = jest.fn();
    isA = jest.fn().mockReturnValue(true);
}
