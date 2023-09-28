import Utils from 'mock/sap/ui/fl/Utils';
import { buildControlData } from '../../../src/cpe/control-data';
import { getNameMock } from 'mock/sap/ui/base/DataType';
import { sapMock } from 'mock/window';
import { mockOverlay } from 'mock/sap/ui/dt/OverlayRegistry';

describe('controlData', () => {
    // prepare
    sapMock.ui.require.mockImplementation((path: any) => {
        if (path === 'sap/ui/core/aria/HasPopup') {
            return { None: 'None', Menu: 'Menu', ListBox: 'ListBox' };
        }
        return undefined;
    });
    getNameMock.mockReturnValueOnce('string').mockReturnValueOnce('').mockReturnValueOnce('string');
    const getDataMock = jest.fn();
    mockOverlay.getDesignTimeMetadata.mockReturnValue({
        getData: getDataMock.mockReturnValue({
            properties: {
                blocked: { ignore: false },
                busyIndicatorDelay: { ignore: true },
                fieldGroupIds: { ignore: true },
                text: { ignore: false },
                width: { ignore: true },
                activeIcon: { ignore: true },
                ariaHasPopup: { ignore: true },
                test: { ignore: true }
            }
        })
    });
    mockOverlay.isSelectable.mockImplementation(() => true);
    const getAllPropertiesMock = jest.fn();
    const control = {
        getMetadata: jest.fn().mockReturnValue({
            getName: jest.fn().mockReturnValue('sap.m.Button'),
            getLibraryName: jest.fn().mockReturnValue('sap.m'),
            getAllProperties: getAllPropertiesMock.mockReturnValue({
                activeIcon: {
                    name: 'activeIcon',
                    type: 'sap.ui.core.URI',
                    group: 'Misc',
                    defaultValue: null,
                    bindable: false,
                    getType: jest.fn().mockReturnValue({
                        getName: jest.fn().mockReturnValue('sap.ui.core.URI')
                    })
                },
                ariaHasPopup: {
                    name: 'ariaHasPopup',
                    type: 'sap.ui.core.aria.HasPopup',
                    group: 'Accessibility',
                    defaultValue: 'None',
                    bindable: false,
                    getType: jest.fn().mockReturnValue({
                        getName: jest.fn().mockReturnValue('sap.ui.core.aria.HasPopup')
                    })
                },
                blocked: {
                    name: 'blocked',
                    type: 'boolean',
                    group: 'Misc',
                    defaultValue: false,
                    bindable: false,
                    getType: jest.fn().mockReturnValue({
                        getName: jest.fn().mockReturnValue('boolean')
                    })
                },
                busyIndicatorDelay: {
                    name: 'busyIndicatorDelay',
                    type: 'int',
                    group: 'Misc',
                    defaultValue: 1000,
                    bindable: false,
                    getType: jest.fn().mockReturnValue({
                        getName: jest.fn().mockReturnValue('int')
                    })
                },
                fieldGroupIds: {
                    name: 'fieldGroupIds',
                    type: 'string[]',
                    group: 'Misc',
                    defaultValue: 'test',
                    bindable: false,
                    getType: jest.fn().mockReturnValue({
                        getName: jest.fn().mockReturnValue('string[]')
                    })
                },
                text: {
                    name: 'text',
                    type: 'string',
                    group: 'Misc',
                    defaultValue: '',
                    bindable: false,
                    getType: jest.fn().mockReturnValue({
                        getName: jest.fn().mockReturnValue('string')
                    })
                },
                width: {
                    name: 'width',
                    type: 'sap.ui.core.CSSSize',
                    group: 'Misc',
                    defaultValue: null,
                    bindable: false,
                    getType: jest.fn().mockReturnValue({
                        getName: jest.fn().mockReturnValue('sap.ui.core.CSSSize')
                    })
                },
                test: {
                    name: 'test',
                    type: 'float',
                    group: 'Misc',
                    defaultValue: null,
                    bindable: false,
                    getType: jest.fn().mockReturnValue({
                        getName: jest.fn().mockReturnValue('float')
                    })
                },
                testProperty: undefined,
                testProperty1: {
                    name: 'testProperty1',
                    group: 'Misc',
                    defaultValue: null,
                    bindable: false,
                    getType: jest.fn().mockReturnValue(undefined)
                },
                testProperty2: {
                    name: 'testProperty2',
                    group: 'Misc',
                    defaultValue: null,
                    bindable: false,
                    getType: jest.fn().mockReturnValue({
                        getName: jest.fn().mockReturnValue(undefined)
                    })
                },
                testProperty3: {
                    name: 'testProperty3',
                    group: 'Misc',
                    defaultValue: null,
                    bindable: false,
                    getType: jest.fn().mockReturnValue({
                        getName: jest.fn().mockReturnValue('any')
                    })
                },
                testProperty4: {
                    name: 'testProperty4',
                    group: 'Misc',
                    defaultValue: null,
                    bindable: false,
                    getType: jest.fn().mockReturnValue({
                        getName: jest.fn().mockReturnValue('object')
                    })
                },
                testProperty5: {
                    name: 'testProperty5',
                    group: 'Misc',
                    defaultValue: null,
                    bindable: false,
                    getType: jest.fn().mockReturnValue({
                        getName: jest.fn().mockReturnValue('void')
                    })
                }
            })
        }),
        getId: jest.fn().mockImplementation(() => 'testID'),
        getProperty: jest
            .fn()
            .mockReturnValueOnce('')
            .mockReturnValueOnce('None')
            .mockReturnValueOnce('false')
            .mockReturnValueOnce(1000)
            .mockReturnValueOnce([])
            .mockReturnValueOnce('')
            .mockReturnValueOnce('')
            .mockReturnValueOnce('1.73')
            .mockReturnValueOnce(undefined)
            .mockReturnValueOnce({ test: 'test' } as object)
            .mockReturnValueOnce(() => 'test'),
        getBindingInfo: jest
            .fn()
            .mockReturnValueOnce(undefined)
            .mockReturnValueOnce(undefined)
            .mockReturnValueOnce({ bindingString: 'testModel>testValue/value' })
            .mockReturnValue(undefined)
    };
    Utils.checkControlId = jest.fn((control) => {
        if (control.getId) {
            return true;
        } else {
            return false;
        }
    });

    test('buildControlData', async () => {
        // act
        const result = await buildControlData(control as any, mockOverlay as any);

        // assert
        expect(result).toMatchSnapshot();
    });
});
