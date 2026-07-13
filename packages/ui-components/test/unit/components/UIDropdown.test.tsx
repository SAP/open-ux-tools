import * as React from 'react';
import { render, fireEvent } from '@testing-library/react';
import type { UIDropdownProps } from '../../../src/components/UIDropdown';
import { UIDropdown, getCalloutCollisionTransformationProps } from '../../../src/components/UIDropdown';
import type { IStyleFunction, ICalloutContentStyles, IDropdownStyleProps, IDropdownProps } from '@fluentui/react';
import { ResponsiveMode } from '@fluentui/react';
import { data as originalData, groupsData as originalGroupsData } from '../../__mock__/select-data';
import { initIcons } from '../../../src/components/Icons';
import { CalloutCollisionTransform } from '../../../src/components';
import type { UISelectableOption } from '../../../src/components';

const data = JSON.parse(JSON.stringify(originalData));
const groupsData = JSON.parse(JSON.stringify(originalGroupsData));

/**
 * Create a UIDropdown class instance and call render() to get the inner Dropdown's props.
 * This avoids any need to spy on React.createElement and works with ESM modules.
 */
const getInnerDropdownProps = (props: UIDropdownProps): IDropdownProps => {
    const instance = new UIDropdown(props);
    const jsx = instance.render() as React.ReactElement;
    return jsx.props as IDropdownProps;
};

describe('<UIDropdown />', () => {
    initIcons();

    let renderResult: ReturnType<typeof render>;

    const openDropdown = (container: HTMLElement): void => {
        const trigger = container.querySelector('.ms-Dropdown .ms-Dropdown-caretDownWrapper');
        if (trigger) {
            fireEvent.click(trigger, document.createEvent('Events'));
        }
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
        renderResult = render(<UIDropdown options={data} selectedKey="EE" />);
    });

    afterEach(() => {
        jest.clearAllMocks();
        renderResult.unmount();
    });

    it('Test responsive mode - default value', () => {
        const dropdownProps = getInnerDropdownProps({ options: data, selectedKey: 'EE' });
        expect(dropdownProps.responsiveMode).toEqual(ResponsiveMode.xxxLarge);
        expect(renderResult.container.querySelector('div.ts-SelectBox')?.className).toEqual(
            'ms-Dropdown-container ts-SelectBox'
        );
    });

    it('Styles - default', () => {
        const dropdownProps = getInnerDropdownProps({ options: data, selectedKey: 'EE' });
        const styles = (dropdownProps.styles as IStyleFunction<{}, {}>)({}) as IDropdownStyleProps;
        expect(styles).toMatchInlineSnapshot(
            {},
            `
            Object {
              "callout": Object {
                "boxShadow": "var(--ui-box-shadow-small)",
              },
              "errorMessage": Array [
                Object {
                  "backgroundColor": "var(--vscode-inputValidation-errorBackground)",
                  "borderBottom": "1px solid var(--vscode-inputValidation-errorBorder)",
                  "borderColor": "var(--vscode-inputValidation-errorBorder)",
                  "borderLeft": "1px solid var(--vscode-inputValidation-errorBorder)",
                  "borderRadius": "var(--vscode-cornerRadius-small)",
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
                "fontSize": "13px",
                "fontWeight": "bold",
                "padding": "4px 0",
              },
            }
        `
        );
    });

    it('Styles - required', () => {
        const dropdownProps = getInnerDropdownProps({ options: data, selectedKey: 'EE', required: true });
        const styles = (dropdownProps.styles as IStyleFunction<{}, {}>)({}) as IDropdownStyleProps;
        expect(styles).toMatchInlineSnapshot(`
            Object {
              "callout": Object {
                "boxShadow": "var(--ui-box-shadow-small)",
              },
              "errorMessage": Array [
                Object {
                  "backgroundColor": "var(--vscode-inputValidation-errorBackground)",
                  "borderBottom": "1px solid var(--vscode-inputValidation-errorBorder)",
                  "borderColor": "var(--vscode-inputValidation-errorBorder)",
                  "borderLeft": "1px solid var(--vscode-inputValidation-errorBorder)",
                  "borderRadius": "var(--vscode-cornerRadius-small)",
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
                "fontSize": "13px",
                "fontWeight": "bold",
                "padding": "4px 0",
                "selectors": Object {
                  "::after": Object {
                    "color": "var(--vscode-inputValidation-errorBorder)",
                    "content": "' *' / ''",
                    "paddingRight": 12,
                  },
                },
              },
            }
        `);
    });

    it('Test responsive mode - custom value', () => {
        const dropdownProps = getInnerDropdownProps({
            options: data,
            selectedKey: 'EE',
            responsiveMode: ResponsiveMode.small
        });
        expect(dropdownProps.responsiveMode).toEqual(ResponsiveMode.small);
    });

    it('Test css selectors which are used in scss - main', () => {
        const { container } = renderResult;
        expect(container.querySelectorAll('div.ts-SelectBox').length).toEqual(1);
        expect(container.querySelectorAll('.ts-SelectBox .ms-Dropdown-title').length).toEqual(1);
        expect(container.querySelectorAll('.ts-SelectBox .ms-Dropdown-caretDownWrapper i svg').length).toEqual(1);
        openDropdown(container);
        expect(document.querySelectorAll('.ts-Callout-Dropdown').length).toBeGreaterThan(0);
        expect(document.querySelectorAll('.ts-Callout-Dropdown .ms-Callout-main').length).toBeGreaterThan(0);
        expect(
            document.querySelectorAll('.ts-Callout-Dropdown .ms-Dropdown-items .ms-Button--command').length
        ).toBeGreaterThan(0);
        expect(document.querySelectorAll('.ms-Dropdown-header').length).toEqual(0);
    });

    it('Test "disabled" property', () => {
        const { container } = renderResult;
        renderResult.rerender(<UIDropdown options={data} selectedKey="EE" disabled={true} />);
        expect(container.querySelectorAll('.ts-SelectBox .ms-Dropdown.is-disabled').length).toEqual(1);
        const dropdownProps = getInnerDropdownProps({ options: data, selectedKey: 'EE', disabled: true });
        expect(dropdownProps.disabled).toEqual(true);
        expect(dropdownProps.tabIndex).toEqual(0);
        expect(dropdownProps['data-is-focusable']).toEqual(true);
    });

    it('Test className property', () => {
        const { container } = renderResult;
        renderResult.rerender(<UIDropdown options={data} selectedKey="EE" className="dummy" />);
        expect(container.querySelector('div.ts-SelectBox')?.className).toEqual(
            'ms-Dropdown-container ts-SelectBox dummy'
        );
    });

    describe('Error message', () => {
        it('Error', () => {
            const { container } = renderResult;
            renderResult.rerender(<UIDropdown options={data} selectedKey="EE" errorMessage="dummy" />);
            expect(container.querySelectorAll('div.ts-SelectBox--error').length).toEqual(1);
            expect(container.querySelectorAll('div.ts-SelectBox--warning').length).toEqual(0);
            expect(container.querySelectorAll('div.ts-SelectBox--info').length).toEqual(0);
        });

        it('Warning', () => {
            const { container } = renderResult;
            renderResult.rerender(<UIDropdown options={data} selectedKey="EE" warningMessage="dummy" />);
            expect(container.querySelectorAll('div.ts-SelectBox--error').length).toEqual(0);
            expect(container.querySelectorAll('div.ts-SelectBox--warning').length).toEqual(1);
            expect(container.querySelectorAll('div.ts-SelectBox--info').length).toEqual(0);
        });

        it('Info', () => {
            const { container } = renderResult;
            renderResult.rerender(<UIDropdown options={data} selectedKey="EE" infoMessage="dummy" />);
            expect(container.querySelectorAll('div.ts-SelectBox--error').length).toEqual(0);
            expect(container.querySelectorAll('div.ts-SelectBox--warning').length).toEqual(0);
            expect(container.querySelectorAll('div.ts-SelectBox--info').length).toEqual(1);
        });
    });

    describe('Test "useDropdownAsMenuMinWidth" property', () => {
        const getCalloutStyles = (
            props: UIDropdownProps,
            width: number
        ): Partial<ICalloutContentStyles> | undefined => {
            const calloutProps = getInnerDropdownProps(props).calloutProps;
            if (calloutProps?.styles) {
                return (calloutProps.styles as IStyleFunction<{}, {}>)({ calloutWidth: width });
            }
            return undefined;
        };

        it('Default', () => {
            const styles = getCalloutStyles(
                { options: data, selectedKey: 'EE', useDropdownAsMenuMinWidth: false },
                100
            );
            expect(styles).toEqual(undefined);
        });

        it('False', () => {
            const styles = getCalloutStyles(
                { options: data, selectedKey: 'EE', useDropdownAsMenuMinWidth: false },
                100
            );
            expect(styles).toEqual(undefined);
        });

        const widths = [100, 500, undefined];
        for (const width of widths) {
            it(`True - width ${width}`, () => {
                const styles = getCalloutStyles(
                    { options: data, selectedKey: 'EE', useDropdownAsMenuMinWidth: true },
                    width
                );
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
            const { container } = renderResult;
            renderResult.rerender(<UIDropdown options={originalData} selectedKey="EE" />);
            openDropdown(container);
            const buttons = document.querySelectorAll(buttonSelector);
            expect(buttons[buttons.length - 1].getAttribute('title')).toEqual('Yemen');
        });

        it('Custom title', () => {
            const { container } = renderResult;
            const expectTitle = 'dummy';
            const dataTemp = JSON.parse(JSON.stringify(originalData));
            dataTemp[dataTemp.length - 1].title = expectTitle;
            renderResult.rerender(<UIDropdown options={dataTemp} selectedKey="EE" />);
            openDropdown(container);
            const buttons = document.querySelectorAll(buttonSelector);
            expect(buttons[buttons.length - 1].getAttribute('title')).toEqual(expectTitle);
        });

        it('No title', () => {
            const { container } = renderResult;
            const dataTemp = JSON.parse(JSON.stringify(originalData));
            dataTemp[dataTemp.length - 1].title = null;
            renderResult.rerender(<UIDropdown options={dataTemp} selectedKey="EE" />);
            openDropdown(container);
            const buttons = document.querySelectorAll(buttonSelector);
            expect(buttons[buttons.length - 1].getAttribute('title')).toEqual(null);
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
                const props: UIDropdownProps = {
                    options: data,
                    selectedKey: 'EE',
                    readOnly: testCase.readOnly,
                    ...(testCase.disabled && { disabled: testCase.disabled })
                };
                const dropdownProps = getInnerDropdownProps(props);
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
                const { container } = renderResult;
                renderResult.rerender(
                    <UIDropdown
                        options={data}
                        selectedKey={testCase.selectedKey as UIDropdownProps['selectedKey']}
                        selectedKeys={testCase.selectedKeys as UIDropdownProps['selectedKeys']}
                    />
                );
                expect(container.querySelectorAll('div.ts-SelectBox--empty').length).toEqual(testCase.expected ? 1 : 0);
            });
        }
    });

    it('Dropdown items with group headers', () => {
        const { container } = renderResult;
        renderResult.rerender(<UIDropdown options={groupsData} selectedKey="EE" />);
        openDropdown(container);
        expect(document.querySelectorAll('.ms-Dropdown-header').length).toEqual(7);
        expect(document.querySelectorAll('.ms-Dropdown-header .ts-dropdown-item-blocker').length).toEqual(0);
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
                const dropdownProps = getInnerDropdownProps({
                    options: data,
                    selectedKey: 'EE',
                    multiSelect: testCase.multiSelect,
                    calloutCollisionTransformation: testCase.enabled
                });
                const calloutProps = dropdownProps.calloutProps;

                if (expected) {
                    expect(calloutProps?.preventDismissOnEvent).toBeDefined();
                    expect(calloutProps?.layerProps?.onLayerDidMount).toBeDefined();
                    expect(calloutProps?.layerProps?.onLayerWillUnmount).toBeDefined();

                    calloutProps?.preventDismissOnEvent?.({} as Event);
                    calloutProps?.layerProps?.onLayerDidMount?.();
                    calloutProps?.layerProps?.onLayerWillUnmount?.();
                    expect(CalloutCollisionTransformSpy.preventDismissOnEvent).toHaveBeenCalledTimes(1);
                    expect(CalloutCollisionTransformSpy.applyTransformation).toHaveBeenCalledTimes(1);
                    expect(CalloutCollisionTransformSpy.resetTransformation).toHaveBeenCalledTimes(1);
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
            const dropdownProps = getInnerDropdownProps({
                options: data,
                selectedKey: 'EE',
                multiSelect: true,
                calloutCollisionTransformation: true,
                ...externalListeners
            });
            const calloutProps = dropdownProps.calloutProps;
            expect(calloutProps?.preventDismissOnEvent).toBeDefined();
            expect(calloutProps?.layerProps?.onLayerDidMount).toBeDefined();
            expect(calloutProps?.layerProps?.onLayerWillUnmount).toBeDefined();

            calloutProps?.preventDismissOnEvent?.({} as Event);
            calloutProps?.layerProps?.onLayerDidMount?.();
            calloutProps?.layerProps?.onLayerWillUnmount?.();
            expect(CalloutCollisionTransformSpy.preventDismissOnEvent).toHaveBeenCalledTimes(1);
            expect(CalloutCollisionTransformSpy.applyTransformation).toHaveBeenCalledTimes(1);
            expect(CalloutCollisionTransformSpy.resetTransformation).toHaveBeenCalledTimes(1);
            expect(externalListeners.calloutProps.preventDismissOnEvent).toHaveBeenCalledTimes(1);
            expect(externalListeners.calloutProps.layerProps.onLayerDidMount).toHaveBeenCalledTimes(1);
            expect(externalListeners.calloutProps.layerProps.onLayerWillUnmount).toHaveBeenCalledTimes(1);
        });
    });

    it('Custom renderers for "onRenderOption"', () => {
        const { container } = renderResult;
        renderResult.rerender(
            <UIDropdown
                options={data}
                selectedKey="EE"
                onRenderOption={(
                    props?: UISelectableOption,
                    defaultRender?: (props?: UISelectableOption) => JSX.Element | null
                ) => {
                    return <div className="custom-render-option">{defaultRender?.(props)}</div>;
                }}
            />
        );
        openDropdown(container);
        expect(document.querySelectorAll('.custom-render-option').length).toBeGreaterThan(0);
        expect(document.querySelectorAll('.ts-dropdown-item-blocker').length).toBeGreaterThan(0);
    });

    it('Custom renderers for "onRenderItem"', () => {
        const { container } = renderResult;
        renderResult.rerender(
            <UIDropdown
                options={data}
                selectedKey="EE"
                onRenderItem={(
                    props?: UISelectableOption,
                    defaultRender?: (props?: UISelectableOption) => JSX.Element | null
                ) => {
                    return <div className="custom-render-item">{defaultRender?.(props)}</div>;
                }}
            />
        );
        openDropdown(container);
        expect(document.querySelectorAll('.custom-render-item').length).toBeGreaterThan(0);
    });

    it('Test "calloutProps"', () => {
        const { container } = renderResult;
        renderResult.rerender(
            <UIDropdown
                options={data}
                selectedKey="EE"
                calloutProps={{
                    className: 'dummy'
                }}
            />
        );
        openDropdown(container);
        expect(document.querySelectorAll('div.dummy').length).toEqual(1);
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
