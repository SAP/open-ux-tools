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
    ui5.getComponent = jest.fn();
    ui5.getControlById = jest.fn();
    beforeEach(() => {
        OverlayRegistry.getOverlay = jest
            .fn()
            .mockReturnValue({ getElementInstance: jest.fn(), getDomRef: jest.fn().mockReturnValue(undefined) });
        OverlayUtil.getClosestOverlayFor = jest.fn().mockReturnValue({ getElementInstance: jest.fn() });
    });
    describe('isEditable', () => {
        test('control not found by id, search by component', () => {
            (ui5.getControlById as jest.Mock).mockReturnValue(null);
            (ui5.getComponent as jest.Mock).mockReturnValue('mockControl');
            const editable = isEditable(ui5, 'dummyId');
            expect(editable).toBeFalsy();
        });
        test('control found by id, search by getOverlay', () => {
            (ui5.getControlById as jest.Mock).mockReturnValue('mockControl');
            const editable = isEditable(ui5, 'dummyId');
            expect(editable).toBeTruthy();
        });
    });
});
