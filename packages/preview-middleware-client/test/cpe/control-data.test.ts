import Utils from 'sap/ui/fl/Utils';
import { buildControlData } from '../../src/cpe/control-data';
import * as Documentation from '../../src/cpe/documentation';
import DataType from 'sap/ui/base/DataType';
describe('controlData', () => {
    // prepare
    jest.spyOn(Documentation, 'getDocumentation').mockResolvedValueOnce({
        activeIcon: {
            defaultValue: 'test',
            description: 'test doc',
            propertyName: 'activeIcon',
            type: 'testType',
            propertyType: 'testType'
        },
        ariaHasPopup: {
            defaultValue: 'test',
            description: 'test doc',
            propertyName: 'ariaHasPopup',
            type: 'testType',
            propertyType: 'testType'
        },
        blocked: {
            defaultValue: 'test',
            description: 'test description',
            propertyName: 'blocked',
            type: 'testType',
            propertyType: 'testType'
        },
        busyIndicatorDelay: {
            defaultValue: 'test',
            description: 'test description',
            propertyName: 'busyIndicatorDelay',
            type: 'testType',
            propertyType: 'testType'
        },
        fieldGroupIds: {
            defaultValue: 'test',
            description: 'test description',
            propertyName: 'fieldGroupIds',
            type: 'testType',
            propertyType: 'testType'
        },
        text: {
            defaultValue: 'test',
            description: 'test description',
            propertyName: 'text',
            type: 'testType',
            propertyType: 'testType'
        },
        width: {
            defaultValue: 'test',
            description: 'test description',
            propertyName: 'width',
            type: 'testType',
            propertyType: 'testType'
        }
    });

    jest.spyOn(sap.ui, 'require').mockImplementation((path) => {
        if (path === 'sap/ui/core/aria/HasPopup') {
            return { None: 'None', Menu: 'Menu', ListBox: 'ListBox' };
        }
        return undefined;
    });
    jest.spyOn(DataType.prototype, 'getName')
        .mockReturnValueOnce('string')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('string');

    jest.spyOn(Utils, 'checkControlId').mockReturnValue(true);

    const controlOverlay = {
        getDesignTimeMetadata: jest.fn().mockReturnValue({
            getData: jest.fn().mockReturnValue({
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
        }),
        isSelectable: jest.fn().mockImplementation(() => true)
    };
    const control = {
        getMetadata: jest.fn().mockReturnValueOnce({
            getName: jest.fn().mockReturnValue('sap.m.Button'),
            getLibraryName: jest.fn().mockReturnValue('sap.m'),
            getAllProperties: jest.fn().mockReturnValue({
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
            .mockReturnValueOnce(undefined)
            .mockReturnValueOnce(undefined)
            .mockReturnValueOnce(undefined)
            .mockReturnValueOnce(undefined)
            .mockReturnValueOnce(undefined)
            .mockReturnValueOnce(undefined)
            .mockReturnValueOnce(undefined)
            .mockReturnValueOnce(undefined)
    };

    test('buildControlData', async () => {
        // act
        const result = await buildControlData(control as any, controlOverlay as any);

        // assert
        expect(result).toMatchSnapshot();
    });
});
