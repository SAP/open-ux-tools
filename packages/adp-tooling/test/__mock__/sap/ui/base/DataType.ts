// add required functionality for testing here
export default {
    getType: jest.fn().mockReturnValue({ getName: () => 'string' })
};
