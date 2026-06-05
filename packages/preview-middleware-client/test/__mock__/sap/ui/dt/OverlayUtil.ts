import { mockOverlay } from './OverlayRegistry.js';

export default {
    getClosestOverlayFor: jest.fn().mockReturnValue(mockOverlay)
};
