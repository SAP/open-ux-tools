import * as React from 'react';
import * as Enzyme from 'enzyme';
import type { UIDropdownProps } from '../../../src/components/UIDropdown';
import { UIDropdown, getCalloutCollisionTransformationProps } from '../../../src/components/UIDropdown';
import type { IStyleFunction, ICalloutContentStyles, IDropdownStyleProps } from '@fluentui/react';
import { Dropdown, ResponsiveMode } from '@fluentui/react';
import { data as originalData, groupsData as originalGroupsData } from '../../__mock__/select-data';
import { initIcons } from '../../../src/components/Icons';
import { CalloutCollisionTransform } from '../../../src/components';
import type { UISelectableOption } from '../../../src/components';

const data = JSON.parse(JSON.stringify(originalData));
const groupsData = JSON.parse(JSON.stringify(originalGroupsData));

describe('<UIDropdown />', () => {
    let wrapper: Enzyme.ReactWrapper<UIDropdownProps>;
    initIcons();

    const openDropdown = (): void => {
        wrapper.find('.ms-Dropdown .ms-Dropdown-caretDownWrapper').simulate('click', document.createEvent('Events'));
    };

    let CalloutCollisionTransformSpy: {
        preventDismissOnEvent: jest.SpyInstance;
        applyTransformation: jest.SpyInstance;
        resetTransformation: jest.SpyInstance;
    };

    beforeEach(() => {
        CalloutCollisionTransformSpy = {
            preventDismissOnEvent: jest.spyOn(CalloutCollisionTransform.prototype, 'preventDismissOnEvent'),
            applyTransformation: jest.spyOn(CalloutCollisionTransform.prototype, 'applyTransformation'),
            resetTransformation: jest.spyOn(CalloutCollisionTransform.prototype, 'resetTransformation')
        };
        wrapper = Enzyme.mount(<UIDropdown options={data} selectedKey="EE" />);
    });

    afterEach(() => {
        jest.clearAllMocks();
        wrapper.unmount();
    });

    it('Test responsive mode - default value', () => {
        expect(wrapper.find(Dropdown).prop('responsiveMode')).toEqual(ResponsiveMode.xxxLarge);
        expect(wrapper.find('div.ts-SelectBox').prop('className')).toEqual('ms-Dropdown-container ts-SelectBox');
    });

    it('Styles - default', () => {
        const styles = (wrapper.find(Dropdown).props().styles as IStyleFunction<{}, {}>)({}) as IDropdownStyleProps;
        expect(styles).toMatchInlineSnapshot(
            {},
            `
            Object {
              "errorMessage": Array [
                Object {
                  "backgroundColor": "var(--vscode-inputValidation-errorBackground)",
                  "borderBottom": "1px solid var(--vscode-inputValidation-errorBorder)",
                  "borderColor": "var(--vscode-inputValidation-errorBorder)",
                  "borderLeft": "1px solid var(--vscode-inputValidation-errorBorder)",
                  "borderRight": "1px solid var(--vscode-inputValidation-errorBorder)",
                  "color": "var(--vscode-input-foreground)",
                  "margin": 0,
                  "paddingBottom": 5,
                  "paddingLeft": 8,
                  "paddingTop": 4,
                },
              ],
              "label": Object {
                "color": "var(--vscode-input-foreground)",
                "fontFamily": "var(--vscode-font-family)",
                "fontSize": "13px",
                "fontWeight": "bold",
                "padding": "4px 0",
              },
            }
        `
        );
    });

    it('Test responsive mode - custom value', () => {
        wrapper.setProps({
            responsiveMode: ResponsiveMode.small
        });
        expect(wrapper.find(Dropdown).prop('responsiveMode')).toEqual(ResponsiveMode.small);
    });

    it('Test css selectors which are used in scss - main', () => {
        expect(wrapper.find('div.ts-SelectBox').length).toEqual(1);
        expect(wrapper.find('.ts-SelectBox .ms-Dropdown-title').length).toEqual(1);
        expect(wrapper.find('.ts-SelectBox .ms-Dropdown-caretDownWrapper i svg').length).toEqual(1);
        openDropdown();
        expect(wrapper.find('.ts-Callout-Dropdown').length).toBeGreaterThan(0);
        expect(wrapper.find('.ts-Callout-Dropdown .ms-Callout-main').length).toBeGreaterThan(0);
        expect(wrapper.find('.ts-Callout-Dropdown .ms-Dropdown-items .ms-Button--command').length).toBeGreaterThan(0);
        expect(wrapper.find('.ms-Dropdown-header').length).toEqual(0);
    });

    it('Test "disabled" property', () => {
        wrapper.setProps({
            disabled: true
        });
        expect(wrapper.find('.ts-SelectBox .ms-Dropdown.is-disabled').length).toEqual(1);
        const dropdownProps = wrapper.find(Dropdown)?.props();
        expect(dropdownProps?.disabled).toEqual(true);
        expect(dropdownProps?.tabIndex).toEqual(0);
        expect(dropdownProps?.['data-is-focusable']).toEqual(true);
    });

    it('Test className property', () => {
        wrapper.setProps({
            className: 'dummy'
        });
        expect(wrapper.find('div.ts-SelectBox').prop('className')).toEqual('ms-Dropdown-container ts-SelectBox dummy');
    });

    describe('Error message', () => {
        it('Error', () => {
            wrapper.setProps({
                errorMessage: 'dummy'
            });
            expect(wrapper.find('div.ts-SelectBox--error').length).toEqual(1);
            expect(wrapper.find('div.ts-SelectBox--warning').length).toEqual(0);
            expect(wrapper.find('div.ts-SelectBox--info').length).toEqual(0);
        });

        it('Warning', () => {
            wrapper.setProps({
                warningMessage: 'dummy'
            });
            expect(wrapper.find('div.ts-SelectBox--error').length).toEqual(0);
            expect(wrapper.find('div.ts-SelectBox--warning').length).toEqual(1);
            expect(wrapper.find('div.ts-SelectBox--info').length).toEqual(0);
        });

        it('Info', () => {
            wrapper.setProps({
                infoMessage: 'dummy'
            });
            expect(wrapper.find('div.ts-SelectBox--error').length).toEqual(0);
            expect(wrapper.find('div.ts-SelectBox--warning').length).toEqual(0);
            expect(wrapper.find('div.ts-SelectBox--info').length).toEqual(1);
        });
    });

    describe('Test "useDropdownAsMenuMinWidth" property', () => {
        const getCalloutStyles = (width: number): Partial<ICalloutContentStyles> | undefined => {
            const calloutProps = wrapper.find(Dropdown).prop('calloutProps');
            let calloutStyles;
            if (calloutProps.styles) {
                calloutStyles = (calloutProps.styles as IStyleFunction<{}, {}>)({
                    calloutWidth: width
                });
            }
            return calloutStyles;
        };

        it('Default', () => {
            wrapper.setProps({
                useDropdownAsMenuMinWidth: false
            });
            const styles = getCalloutStyles(100);
            expect(styles).toEqual(undefined);
        });

        it('False', () => {
            wrapper.setProps({
                useDropdownAsMenuMinWidth: false
            });
            const styles = getCalloutStyles(100);
            expect(styles).toEqual(undefined);
        });

        const widths = [100, 500, undefined];
        for (const width of widths) {
            it(`True - width ${width}`, () => {
                wrapper.setProps({
                    useDropdownAsMenuMinWidth: true
                });
                const styles = getCalloutStyles(width);
                expect(styles).toEqual({
                    root: {
                        maxWidth: 'calc(100% - 10px)',
                        minWidth: width,
                        width: 'auto'
                    }
                });
            });
        }
    });

    describe('Behavior of title/tooltip for options', () => {
        const buttonSelector = '.ts-Callout-Dropdown .ms-Button--command';
        it('Default - inherit from text', () => {
            wrapper.setProps({
                options: originalData
            });
            openDropdown();
            expect(wrapper.find(buttonSelector).last().getDOMNode().getAttribute('title')).toEqual('Yemen');
        });

        it('Custom title', () => {
            const expectTitle = 'dummy';
            const dataTemp = JSON.parse(JSON.stringify(originalData));
            dataTemp[dataTemp.length - 1].title = expectTitle;
            wrapper.setProps({
                options: dataTemp
            });
            openDropdown();
            expect(wrapper.find(buttonSelector).last().getDOMNode().getAttribute('title')).toEqual(expectTitle);
        });

        it('No title', () => {
            const dataTemp = JSON.parse(JSON.stringify(originalData));
            dataTemp[dataTemp.length - 1].title = null;
            wrapper.setProps({
                options: dataTemp
            });
            openDropdown();
            expect(wrapper.find(buttonSelector).last().getDOMNode().getAttribute('title')).toEqual(null);
        });
    });

    describe('Test "readonly" property', () => {
        const testCases = [
            {
                readOnly: true,
                expected: {
                    readOnly: true
                }
            },
            {
                readOnly: true,
                expected: {
                    readOnly: true
                }
            },
            {
                readOnly: true,
                disabled: true,
                expected: {
                    readOnly: true
                }
            },
            {
                readOnly: undefined,
                expected: {
                    readOnly: undefined
                }
            },
            {
                readOnly: false,
                expected: {
                    readOnly: false
                }
            }
        ];
        for (const testCase of testCases) {
            it(`"readOnly=${testCase.readOnly}", "disabled=${testCase.disabled}"`, () => {
                const { expected } = testCase;
                wrapper.setProps({
                    readOnly: testCase.readOnly,
                    ...(testCase.disabled && { disabled: testCase.disabled })
                });
                const dropdown = wrapper.find(Dropdown);
                expect(dropdown.length).toEqual(1);
                const dropdownProps = dropdown.props();
                expect(dropdownProps.disabled).toEqual(expected.readOnly);
                const className = dropdownProps.className;
                expect(className?.includes('ts-SelectBox--readonly')).toEqual(
                    !testCase.disabled ? !!expected.readOnly : false
                );
                expect(className?.includes('ts-SelectBox--disabled')).toEqual(!!testCase.disabled);
                // Additional properties
                if (!testCase.disabled && expected.readOnly) {
                    expect(dropdownProps.tabIndex).toEqual(0);
                    expect(dropdownProps['data-is-focusable']).toEqual(true);
                    expect(dropdownProps['aria-readonly']).toEqual(true);
                    expect('aria-disabled' in dropdownProps).toEqual(true);
                    expect(dropdownProps['aria-disabled']).toEqual(undefined);
                } else if (testCase.disabled) {
                    expect(dropdownProps.tabIndex).toEqual(0);
                    expect('data-is-focusable' in dropdownProps).toEqual(true);
                    expect('aria-readonly' in dropdownProps).toEqual(false);
                    expect('aria-disabled' in dropdownProps).toEqual(false);
                } else {
                    expect('tabIndex' in dropdownProps).toEqual(false);
                    expect('data-is-focusable' in dropdownProps).toEqual(false);
                    expect('aria-readonly' in dropdownProps).toEqual(false);
                    expect('aria-disabled' in dropdownProps).toEqual(false);
                }
            });
        }
    });

    describe('Empty dropdown classname', () => {
        const testCases = [
            {
                selectedKey: 'EE',
                expected: false
            },
            {
                selectedKey: ['EE'],
                expected: false
            },
            {
                selectedKeys: ['EE'],
                expected: false
            },
            {
                selectedKey: [],
                expected: true
            },
            {
                selectedKeys: [],
                expected: true
            },
            {
                selectedKey: undefined,
                expected: true
            }
        ];
        for (const testCase of testCases) {
            it(`"selectedKey=${testCase.selectedKey}","selectedKeys=${JSON.stringify(testCase.selectedKeys)}"`, () => {
                wrapper.setProps({
                    selectedKey: testCase.selectedKey,
                    selectedKeys: testCase.selectedKeys
                });
                expect(wrapper.find('div.ts-SelectBox--empty').length).toEqual(testCase.expected ? 1 : 0);
            });
        }
    });

    it('Dropdown items with group headers', () => {
        wrapper.setProps({
            options: groupsData
        });
        wrapper.update();
        openDropdown();
        expect(wrapper.find('.ms-Dropdown-header').length).toEqual(7);
        expect(wrapper.find('.ms-Dropdown-header .ts-dropdown-item-blocker').length).toEqual(0);
    });

    describe('Test "calloutCollisionTransformation" property', () => {
        const testCases = [
            {
                multiSelect: true,
                enabled: true,
                expected: true
            },
            {
                multiSelect: false,
                enabled: true,
                expected: false
            },
            {
                multiSelect: true,
                enabled: false,
                expected: false
            }
        ];
        for (const testCase of testCases) {
            const { multiSelect, enabled, expected } = testCase;
            it(`calloutCollisionTransformation=${enabled}, multiSelect=${multiSelect}`, () => {
                wrapper.setProps({
                    multiSelect: testCase.multiSelect,
                    calloutCollisionTransformation: testCase.enabled
                });
                const dropdown = wrapper.find(Dropdown);
                expect(dropdown.length).toEqual(1);
                const calloutProps = dropdown.prop('calloutProps');

                if (expected) {
                    expect(calloutProps?.preventDismissOnEvent).toBeDefined();
                    expect(calloutProps?.layerProps?.onLayerDidMount).toBeDefined();
                    expect(calloutProps?.layerProps?.onLayerWillUnmount).toBeDefined();

                    calloutProps?.preventDismissOnEvent?.({} as Event);
                    calloutProps?.layerProps?.onLayerDidMount?.();
                    calloutProps?.layerProps?.onLayerWillUnmount?.();
                    expect(CalloutCollisionTransformSpy.preventDismissOnEvent).toBeCalledTimes(1);
                    expect(CalloutCollisionTransformSpy.applyTransformation).toBeCalledTimes(1);
                    expect(CalloutCollisionTransformSpy.resetTransformation).toBeCalledTimes(1);
                } else {
                    expect(calloutProps?.preventDismissOnEvent).toBeUndefined();
                    expect(calloutProps?.layerProps?.onLayerDidMount).toBeUndefined();
                    expect(calloutProps?.layerProps?.onLayerWillUnmount).toBeUndefined();
                }
            });
        }

        it(`Pass external listeners`, () => {
            const externalListeners = {
                calloutProps: {
                    preventDismissOnEvent: jest.fn(),
                    layerProps: {
                        onLayerDidMount: jest.fn(),
                        onLayerWillUnmount: jest.fn()
                    }
                }
            };
            wrapper.setProps({
                multiSelect: true,
                calloutCollisionTransformation: true,
                ...externalListeners
            });
            const dropdown = wrapper.find(Dropdown);
            expect(dropdown.length).toEqual(1);
            const calloutProps = dropdown.prop('calloutProps');
            expect(calloutProps?.preventDismissOnEvent).toBeDefined();
            expect(calloutProps?.layerProps?.onLayerDidMount).toBeDefined();
            expect(calloutProps?.layerProps?.onLayerWillUnmount).toBeDefined();

            calloutProps?.preventDismissOnEvent?.({} as Event);
            calloutProps?.layerProps?.onLayerDidMount?.();
            calloutProps?.layerProps?.onLayerWillUnmount?.();
            expect(CalloutCollisionTransformSpy.preventDismissOnEvent).toBeCalledTimes(1);
            expect(CalloutCollisionTransformSpy.applyTransformation).toBeCalledTimes(1);
            expect(CalloutCollisionTransformSpy.resetTransformation).toBeCalledTimes(1);
            expect(externalListeners.calloutProps.preventDismissOnEvent).toBeCalledTimes(1);
            expect(externalListeners.calloutProps.layerProps.onLayerDidMount).toBeCalledTimes(1);
            expect(externalListeners.calloutProps.layerProps.onLayerWillUnmount).toBeCalledTimes(1);
        });
    });

    it('Custom renderers for "onRenderOption"', () => {
        wrapper.setProps({
            onRenderOption: (
                props?: UISelectableOption,
                defaultRender?: (props?: UISelectableOption) => JSX.Element | null
            ) => {
                return <div className="custom-render-option">{defaultRender?.(props)}</div>;
            }
        });
        openDropdown();
        expect(wrapper.find('.custom-render-option').length).toBeGreaterThan(0);
        expect(wrapper.find('.ts-dropdown-item-blocker').length).toBeGreaterThan(0);
    });

    it('Custom renderers for "onRenderItem"', () => {
        wrapper.setProps({
            onRenderItem: (
                props?: UISelectableOption,
                defaultRender?: (props?: UISelectableOption) => JSX.Element | null
            ) => {
                return <div className="custom-render-item">{defaultRender?.(props)}</div>;
            }
        });
        openDropdown();
        expect(wrapper.find('.custom-render-item').length).toBeGreaterThan(0);
    });

    it('Test "calloutProps"', () => {
        wrapper.setProps({
            calloutProps: {
                className: 'dummy'
            }
        });
        openDropdown();
        expect(wrapper.find('div.dummy').length).toEqual(1);
    });
});

describe('Utils/getCalloutCollisionTransformationProps', () => {
    const testCases = [
        {
            multiSelect: true,
            enabled: true,
            expectation: true
        },
        {
            multiSelect: true,
            enabled: false,
            expectation: true
        },
        {
            multiSelect: false,
            enabled: true,
            expectation: true
        },
        {
            multiSelect: undefined,
            enabled: undefined,
            expectation: true
        }
    ];
    for (const testCase of testCases) {
        const { multiSelect, enabled, expectation } = testCase;
        it(`getCalloutCollisionTransformationProps - multiSelect=${multiSelect}, enabled=${enabled}`, () => {
            const source = React.createRef<HTMLElement>();
            const menu = React.createRef<HTMLElement>();
            const calloutCollisionTransform = new CalloutCollisionTransform(source, menu);
            const props = getCalloutCollisionTransformationProps(calloutCollisionTransform, true, true);

            expect(props).toEqual(
                expectation
                    ? {
                          preventDismissOnEvent: calloutCollisionTransform.preventDismissOnEvent,
                          layerProps: {
                              onLayerDidMount: calloutCollisionTransform.applyTransformation,
                              onLayerWillUnmount: calloutCollisionTransform.resetTransformation
                          }
                      }
                    : undefined
            );
        });
    }
});
