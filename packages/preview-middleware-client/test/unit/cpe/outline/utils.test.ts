import OverlayRegistry from 'mock/sap/ui/dt/OverlayRegistry';
import { isEditable, isReuseComponent } from '../../../../src/cpe/outline/utils';
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
            const editable = isEditable('dummyId');

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
            const editable = isEditable('dummyId');

            // assert
            expect(editable).toBeTruthy();
            expect(OverlayUtil.getClosestOverlayFor).toBeCalledWith('mockControl');
            expect(getRuntimeControlSpy).toBeCalledWith(mockControlOverlay);
        });
    });

    describe('isReuseComponent', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });
        const componentMock = {
            getManifest: () => {
                return {
                    ['sap.app']: {
                        type: 'component'
                    }
                };
            }
        };
        const clickedControlId = 'someViewId';
        it('should return false for ui5 minor version lower than 114', () => {
            expect(isReuseComponent(clickedControlId, { major: 1, minor: 112 })).toBe(false);
        });

        it('should return false when cannot find component with clicked control Id', () => {
            ComponentMock.getComponentById = jest.fn().mockReturnValue(undefined);

            expect(isReuseComponent(clickedControlId, { major: 1, minor: 118 })).toBe(false);
        });

        it('should return false when manifest is undefined', () => {
            ComponentMock.getComponentById = jest.fn().mockReturnValue({
                getManifest: () => undefined
            });

            expect(isReuseComponent(clickedControlId, { major: 1, minor: 118 })).toBe(false);
        });

        it('should return false when type is not component', () => {
            ComponentMock.getComponentById = jest.fn().mockReturnValue({
                getManifest: () => {
                    return {
                        ['sap.app']: {
                            type: 'view'
                        }
                    };
                }
            });

            expect(isReuseComponent(clickedControlId, { major: 1, minor: 118 })).toBe(false);
        });

        it('should return true when type is component', () => {
            ComponentMock.getComponentById = jest.fn().mockReturnValue(componentMock);

            expect(isReuseComponent(clickedControlId, { major: 1, minor: 118 })).toBe(true);
        });
    });
});
