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
    const getDataMockData = {
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
    };
    mockOverlay.getDesignTimeMetadata.mockReturnValue({
        getData: getDataMock.mockReturnValue(getDataMockData)
    });
    const getAllPropertiesMock = jest.fn();
    const properties = {
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
    };
    const control = {
        getMetadata: jest.fn().mockReturnValue({
            getName: jest
                .fn()
                .mockReturnValueOnce('sap.m.Button')
                .mockReturnValueOnce('sap.m.Button')
                .mockReturnValueOnce('sap.fe.macros.table.TableAPI'),
            getLibraryName: jest
                .fn()
                .mockReturnValueOnce('sap.m')
                .mockReturnValueOnce('sap.m')
                .mockRejectedValueOnce('sap.fe.macros'),
            getAllProperties: getAllPropertiesMock
                .mockReturnValueOnce(properties)
                .mockReturnValueOnce(properties)
                .mockReturnValueOnce({
                    contextPath: {
                        bindable: true,
                        byValue: false,
                        defaultValue: undefined,
                        deprecated: false,
                        group: 'Misc',
                        name: 'contextPath',
                        selector: null,
                        type: 'string',
                        visibility: 'public',
                        getType: jest.fn().mockReturnValue({
                            getName: jest.fn().mockReturnValue('string')
                        })
                    }
                })
        }),
        getId: jest.fn(),
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
            .mockReturnValue(undefined),
        isA: jest.fn()
    };
    Utils.checkControlId = jest.fn((control) => {
        if (control.getId()) {
            return true;
        } else {
            return false;
        }
    });

    test('buildControlData', () => {
        control.getId.mockImplementation(() => 'testID');
        control.isA.mockReturnValue(false);
        mockOverlay.isSelectable.mockResolvedValueOnce(false).mockReturnValue(true);

        // act
        const result = buildControlData(control as any, mockOverlay as any);

        // assert
        expect(result).toMatchSnapshot();
    });

    test('buildControlData - disabled properties for noStableId', () => {
        control.getId.mockImplementation(() => '');
        control.isA.mockReturnValue(false);
        mockOverlay.isSelectable.mockReturnValue(true);

        // act
        const result = buildControlData(control as any, mockOverlay as any);

        // result.properties.name === 'blocked' and result.properties.name === 'text' are isEnabled: false for no stableId
        expect(result).toMatchSnapshot();
    });
    test('buildControlData - fe', () => {
        control.getId.mockImplementation(() => 'testID');
        control.isA.mockReturnValue(true);
        mockOverlay.isSelectable.mockResolvedValueOnce(false).mockReturnValue(true);

        // act
        const result = buildControlData(control as any, mockOverlay as any);

        // assert
        expect(result).toMatchSnapshot();
    });
});
