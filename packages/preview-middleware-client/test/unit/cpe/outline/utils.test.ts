import OverlayRegistry from 'mock/sap/ui/dt/OverlayRegistry';
import OverlayUtil from 'mock/sap/ui/dt/OverlayUtil';
import ComponentMock from 'mock/sap/ui/core/Component';
import { sapCoreMock } from 'mock/window';

jest.unstable_mockModule('open/ux/preview/client/cpe/control-data', () => {
    return {
        buildControlData: () => {
            return {
                properties: [{ isEnabled: true }]
            };
        }
    };
});

const getRuntimeControlMock = jest.fn();
jest.unstable_mockModule('open/ux/preview/client/cpe/utils', () => ({
    getRuntimeControl: getRuntimeControlMock,
    isReuseComponent: jest.fn()
}));

const { isEditable } = await import('open/ux/preview/client/cpe/outline/editable');

describe('utils', () => {
    ComponentMock.get = jest.fn();

    beforeEach(() => {
        OverlayRegistry.getOverlay.mockClear();
        OverlayUtil.getClosestOverlayFor.mockClear();
    });
    describe('isEditable', () => {
        test('control not found by id, search by component', () => {
            sapCoreMock.byId.mockReturnValue(null);
            (ComponentMock.get as jest.Mock).mockReturnValue('mockControl');

            // act
            const editable = isEditable({} as any, 'dummyId');

            // assert
            expect(editable).toBeFalsy();
        });
        test('control found by id, search by getOverlay', () => {
            (sapCoreMock.byId as jest.Mock).mockReturnValue('mockControl');
            const mockControlOverlay = {
                getElementInstance: jest.fn().mockReturnValue('mockControlOverlay')
            };
            OverlayUtil.getClosestOverlayFor.mockReturnValue(mockControlOverlay);
            // act
            const editable = isEditable({} as any, 'dummyId');

            // assert
            expect(editable).toBeTruthy();
            expect(OverlayUtil.getClosestOverlayFor).toHaveBeenCalledWith('mockControl');
            expect(getRuntimeControlMock).toHaveBeenCalledWith(mockControlOverlay);
        });
    });
});
