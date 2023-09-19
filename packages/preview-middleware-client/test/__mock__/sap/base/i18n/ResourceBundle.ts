export const mockBundle = {
    getText: jest.fn()
};

export default {
    create: jest.fn().mockReturnValue(mockBundle)
};
