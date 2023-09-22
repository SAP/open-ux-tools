import { mockOverlay } from './OverlayRegistry';

export default {
    getClosestOverlayFor: jest.fn().mockReturnValue(mockOverlay)
};
