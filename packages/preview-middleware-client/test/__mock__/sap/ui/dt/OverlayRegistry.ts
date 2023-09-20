// add required functionality for testing here
export default {
    getOverlay: () => {
        return {
            getDesignTimeMetadata: () => {
                return jest.fn();
            }
        };
    }
};
