export const mockOverlay = {
    getDesignTimeMetadata: jest.fn(),
    isSelectable: jest.fn(),
    setSelected: jest.fn(),
    getDomRef: jest.fn(),
    getElementInstance: jest.fn()
};

export default class OverlayRegistry {
    getOverlay = jest.fn().mockReturnValue(mockOverlay)
};
