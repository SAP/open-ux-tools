// add required functionality for testing here
export default jest.fn().mockReturnValue({
    getOverlay: jest.fn().mockReturnValue({ getDesignTimeMetadata: jest.fn() })
});
