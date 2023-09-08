import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import { isEditable } from '../../../../src/cpe/outline/utils';
import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import { createUi5Facade } from '../../../../src/cpe/facade';
jest.mock('../../../../src/cpe/control-data', () => {
    return {
        buildControlData: () => {
            return {
                properties: [{ isEnabled: true }]
            };
        }
    };
});
describe('utils', () => {
    const ui5 = createUi5Facade();
    const mockGetComponent = jest.fn();
    const mockGetId = jest.fn();
    beforeEach(() => {
        sap.ui = {
            getCore: jest.fn().mockReturnValue({ byId: mockGetId, getComponent: mockGetComponent })
        } as any;
        OverlayRegistry.getOverlay = jest
            .fn()
            .mockReturnValue({ getElementInstance: jest.fn(), getDomRef: jest.fn().mockReturnValue(undefined) });
        OverlayUtil.getClosestOverlayFor = jest.fn().mockReturnValue({ getElementInstance: jest.fn() });
    });
    describe('isEditable', () => {
        test('control not found by id, search by component', () => {
            mockGetId.mockReturnValue(null);
            mockGetComponent.mockReturnValue('mockControl');
            const editable = isEditable(ui5, 'dummyId');
            expect(editable).toBeTruthy();
        });
        test('control found by id, search by getOverlay', () => {
            mockGetId.mockReturnValue('mockControl');
            const editable = isEditable(ui5, 'dummyId');
            expect(editable).toBeTruthy();
        });
    });
});
