// add required functionality for testing here
export default class Utils {
    checkControlId = jest.fn().mockReturnValue(true);
    static getViewForControl = jest.fn().mockReturnValue({
        getId: jest.fn()
    });
    getAppComponentForControl= jest.fn()
};
