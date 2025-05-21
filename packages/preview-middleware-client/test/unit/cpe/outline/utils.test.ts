import OverlayRegistry from 'mock/sap/ui/dt/OverlayRegistry';
import { isEditable } from '../../../../src/cpe/outline/editable';
import OverlayUtil from 'mock/sap/ui/dt/OverlayUtil';
import ComponentMock from 'mock/sap/ui/core/Component';
import { sapCoreMock } from 'mock/window';
import * as cpeUtils from '../../../../src/cpe/utils';
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
            const getRuntimeControlSpy = jest.spyOn(cpeUtils, 'getRuntimeControl');
            // act
            const editable = isEditable({} as any, 'dummyId');

            // assert
            expect(editable).toBeTruthy();
            expect(OverlayUtil.getClosestOverlayFor).toBeCalledWith('mockControl');
            expect(getRuntimeControlSpy).toBeCalledWith(mockControlOverlay);
        });
    });
});
