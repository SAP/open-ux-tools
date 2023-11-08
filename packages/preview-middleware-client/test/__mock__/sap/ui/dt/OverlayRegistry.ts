export const mockOverlay = {
    getDesignTimeMetadata: jest.fn(),
    isSelectable: jest.fn(),
    setSelected: jest.fn(),
    getDomRef: jest.fn(),
    getElementInstance: jest.fn()
};

export default {
    getOverlay: jest.fn().mockReturnValue(mockOverlay)
};
