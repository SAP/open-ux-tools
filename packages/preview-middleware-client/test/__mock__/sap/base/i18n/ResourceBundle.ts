export const mockBundle = {
    getText: jest.fn(),
    hasText: jest.fn()
};

export default {
    create: jest.fn().mockReturnValue(mockBundle)
};
