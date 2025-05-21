// add required functionality for testing here
export const attachBeforeClose = jest.fn();
export default {
    load: jest.fn().mockReturnValue({
        attachBeforeClose,
        setEscapeHandler: jest.fn()
    })
};
