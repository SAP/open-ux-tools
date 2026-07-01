export default class SysInfoBarMock {
    constructor(public id?: string, public settings?: object) {}

    placeAt = jest.fn().mockReturnValue(this);
}
