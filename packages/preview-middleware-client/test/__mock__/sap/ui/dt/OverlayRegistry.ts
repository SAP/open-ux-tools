export const mockOverlay = {
    getDesignTimeMetadata: () => {
        return jest.fn();
    }
};

export default {
    getOverlay: jest.fn().mockReturnValue(mockOverlay)
};
