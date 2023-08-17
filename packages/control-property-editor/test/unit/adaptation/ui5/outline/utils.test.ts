import { isEditable } from '../../../../../src/adaptation/ui5/outline/utils';
jest.mock('../../../../../src/adaptation/ui5/controlData', () => {
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
        global.sap = {
            ui: {
                getCore: () => {
                    return {
                        byId: mockGetId,
                        getComponent: mockGetComponent
                    };
                },
                dt: {
                    OverlayRegistry: {
                        getOverlay: () => {
                            return;
                        }
                    },
                    OverlayUtil: {
                        getClosestOverlayFor: mockGetClosestOverlayFor
                    }
                }
            }
        } as any;
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
