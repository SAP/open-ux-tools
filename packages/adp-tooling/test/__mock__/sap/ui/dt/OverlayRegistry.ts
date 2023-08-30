// add required functionality for testing here
export default {
    getOverlay: jest.fn().mockReturnValue({ getDesignTimeMetadata: jest.fn() })
};
