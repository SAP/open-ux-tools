import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    initIcons();

    const openDropdown = async (container: HTMLElement): Promise<void> => {
        const dropdownButton = container.querySelector('.ms-Dropdown .ms-Dropdown-caretDownWrapper');
        if (dropdownButton) {
            fireEvent.click(dropdownButton);
            await waitFor(() => {
                expect(document.querySelector('.ts-Callout-Dropdown')).toBeInTheDocument();
            });
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
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Test responsive mode - default value', () => {
        const { container } = render(<UIDropdown options={data} selectedKey="EE" />);
        const selectBox = container.querySelector('div.ts-SelectBox');
        expect(selectBox).toBeInTheDocument();
        expect(selectBox).toHaveClass('ms-Dropdown-container', 'ts-SelectBox');
    });

    it('Styles - default', () => {
        const { container } = render(<UIDropdown options={data} selectedKey=\"EE\" />);
        const dropdown = container.querySelector('.ms-Dropdown');
        expect(dropdown).toBeInTheDocument();
    });

    it('Styles - required', () => {
        const { container } = render(<UIDropdown options={data} selectedKey=\"EE\" required={true} />);
        const dropdown = container.querySelector('.ms-Dropdown');
        expect(dropdown).toBeInTheDocument();
    });

    it('Test responsive mode - custom value', () => {
        const { container } = render(<UIDropdown options={data} selectedKey="EE" responsiveMode={ResponsiveMode.small} />);
        const selectBox = container.querySelector('div.ts-SelectBox');
        expect(selectBox).toBeInTheDocument();
    });

    it('Test css selectors which are used in scss - main', async () => {
        const { container } = render(<UIDropdown options={data} selectedKey=\"EE\" />);
        expect(container.querySelector('div.ts-SelectBox')).toBeInTheDocument();
        expect(container.querySelector('.ts-SelectBox .ms-Dropdown-title')).toBeInTheDocument();
        expect(container.querySelector('.ts-SelectBox .ms-Dropdown-caretDownWrapper i svg')).toBeInTheDocument();
        
        await openDropdown(container);
        expect(document.querySelector('.ts-Callout-Dropdown')).toBeInTheDocument();
        expect(document.querySelector('.ts-Callout-Dropdown .ms-Callout-main')).toBeInTheDocument();
        expect(document.querySelector('.ts-Callout-Dropdown .ms-Dropdown-items .ms-Button--command')).toBeInTheDocument();
        expect(document.querySelector('.ms-Dropdown-header')).not.toBeInTheDocument();
    });

    it('Test "disabled" property', () => {
        const { container } = render(<UIDropdown options={data} selectedKey="EE" disabled={true} />);
        const disabledDropdown = container.querySelector('.ts-SelectBox .ms-Dropdown.is-disabled');
        expect(disabledDropdown).toBeInTheDocument();
    });

    it('Test className property', () => {
        const { container } = render(<UIDropdown options={data} selectedKey="EE" className="dummy" />);
        const selectBox = container.querySelector('div.ts-SelectBox');
        expect(selectBox).toHaveClass('ms-Dropdown-container', 'ts-SelectBox', 'dummy');
    });

    describe('Error message', () => {
        it('Error', () => {
            const { container } = render(<UIDropdown options={data} selectedKey="EE" errorMessage="dummy" />);
            expect(container.querySelector('div.ts-SelectBox--error')).toBeInTheDocument();
            expect(container.querySelector('div.ts-SelectBox--warning')).not.toBeInTheDocument();
            expect(container.querySelector('div.ts-SelectBox--info')).not.toBeInTheDocument();
        });

        it('Warning', () => {
            const { container } = render(<UIDropdown options={data} selectedKey="EE" warningMessage="dummy" />);
            expect(container.querySelector('div.ts-SelectBox--error')).not.toBeInTheDocument();
            expect(container.querySelector('div.ts-SelectBox--warning')).toBeInTheDocument();
            expect(container.querySelector('div.ts-SelectBox--info')).not.toBeInTheDocument();
        });

        it('Info', () => {
            const { container } = render(<UIDropdown options={data} selectedKey="EE" infoMessage="dummy" />);
            expect(container.querySelector('div.ts-SelectBox--error')).not.toBeInTheDocument();
            expect(container.querySelector('div.ts-SelectBox--warning')).not.toBeInTheDocument();
            expect(container.querySelector('div.ts-SelectBox--info')).toBeInTheDocument();
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

    it('Dropdown items with group headers', async () => {
        const { container } = render(<UIDropdown options={groupsData} selectedKey=\"EE\" />);
        await openDropdown(container);
        expect(document.querySelectorAll('.ms-Dropdown-header')).toHaveLength(7);
        expect(document.querySelector('.ms-Dropdown-header .ts-dropdown-item-blocker')).not.toBeInTheDocument();
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
