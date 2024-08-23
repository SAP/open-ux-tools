// add required functionality for testing here
export default {
    checkControlId: jest.fn().mockReturnValue(true),
    getViewForControl: jest.fn().mockReturnValue({
        getId: jest.fn()
    }),
    getAppComponentForControl: jest.fn()
};
