// add required functionality for testing here
export default jest.fn().mockReturnValue({
    setProperty: jest.fn(),
    getProperty: jest.fn().mockReturnValue({ addDependent: jest.fn() })
});
