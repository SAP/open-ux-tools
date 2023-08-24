import { isEditable } from '../../../src/outline/utils';
jest.mock('../../../src/controlData', () => {
    return {
        buildControlData: () => {
            return {
                properties: [{ isEnabled: true }]
            };
        }
    };
});
describe('utils', () => {
    const mockGetComponent = jest.fn();
    const mockGetId = jest.fn();
    const mockGetOverlay = jest.fn();
    const mockGetClosestOverlayFor = jest.fn();
    beforeEach(() => {
        sap.ui.getCore = jest.fn().mockReturnValue({ byId: mockGetId, getComponent: mockGetComponent });
    });
    describe('isEditable', () => {
        test('control not found by id, search by component', () => {
            mockGetId.mockReturnValue(null);
            mockGetComponent.mockReturnValue('mockControl');
            const editable = isEditable('dummyId');
            expect(editable).toBeTruthy();
        });
        test('control found by id, search by getOverlay', () => {
            mockGetId.mockReturnValue('mockControl');
            mockGetClosestOverlayFor.mockReturnValue({ getElementInstance: jest.fn() });
            mockGetOverlay.mockReturnValue({ getElementInstance: jest.fn() });
            const editable = isEditable('dummyId');
            expect(editable).toBeTruthy();
        });
    });
});
