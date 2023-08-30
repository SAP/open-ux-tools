// add required functionality for testing here
export default {
    setProperty: jest.fn(),
    getProperty: jest.fn().mockReturnValue({ addDependent: jest.fn() })
};
