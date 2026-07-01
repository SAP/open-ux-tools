export default class ResponsivePopoverMock {
    openBy = jest.fn();
    setModel = jest.fn();

    constructor(public settings?: object) {}

    addStyleClass() {
        return this;
    }
}
