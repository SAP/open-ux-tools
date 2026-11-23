const ExtendControllerPlugin = jest.fn().mockImplementation(() => {
    return {
        execute: jest.fn(),
        add: jest.fn()
    };
});

export default ExtendControllerPlugin;