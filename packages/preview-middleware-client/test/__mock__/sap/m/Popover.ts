export default class PopoverMock {
    close = jest.fn();
    openBy = jest.fn();

    constructor(public settings?: object) {}
}
