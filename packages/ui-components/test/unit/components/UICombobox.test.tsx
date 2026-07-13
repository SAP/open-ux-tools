import * as React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import type { UIComboBoxOption, UIComboBoxProps } from '../../../src/components/UIComboBox';
import { UIComboBox, UIComboBoxLoaderType, UISelectableOptionMenuItemType } from '../../../src/components/UIComboBox';
import { data as originalData, groupsData as originalGroupsData } from '../../__mock__/select-data';
import { initIcons } from '../../../src/components/Icons';
import type { IComboBox, IComboBoxOption } from '@fluentui/react';
import { KeyCodes } from '@fluentui/react';
import { CalloutCollisionTransform } from '../../../src/components/UICallout/CalloutCollisionTransform';

let data: UIComboBoxOption[] = JSON.parse(JSON.stringify(originalData));
const groupsData = JSON.parse(JSON.stringify(originalGroupsData));

// Helper: get the FluentUI ComboBox props from a UIComboBox ref
function getComboBoxProps(ref: React.RefObject<UIComboBox>): Record<string, unknown> {
    return (ref.current as unknown as { comboBox: React.RefObject<{ props: Record<string, unknown> }> }).comboBox
        .current?.props as Record<string, unknown>;
}

describe('<UIComboBox />', () => {
    const menuDropdownSelector = 'div.ts-Callout-Dropdown';
    const nonHighlighttItemSelector = `${menuDropdownSelector} .ms-ComboBox-optionsContainer .ms-Button--command .ms-ComboBox-optionText`;
    const highlightItemSelector = `${menuDropdownSelector} .ms-ComboBox-optionsContainer .ms-Button--command .ts-Menu-option`;
    const inputSelector = 'input.ms-ComboBox-Input';
    const headerItemSelector = '.ms-ComboBox-header';
    initIcons();

    // RTL-compatible: just pass value; tagName is read-only on real DOM elements
    const getInputTarget = (value = '') => {
        return { value };
    };

    let container: HTMLElement;
    let rerender: (ui: React.ReactElement) => void;
    let comboboxRef: React.RefObject<UIComboBox>;

    // Default props used across most tests
    let defaultProps: UIComboBoxProps;

    const openDropdown = (): void => {
        const btn = container.querySelector('.ms-ComboBox .ms-Button--icon') as HTMLElement;
        fireEvent.click(btn, document.createEvent('Events'));
    };

    const triggerSearch = (query: string) => {
        const input = container.querySelector('input') as HTMLInputElement;
        fireEvent.input(input, {
            target: getInputTarget(query)
        });
    };

    let CalloutCollisionTransformSpy: {
        preventDismissOnEvent: jest.SpyInstance;
        applyTransformation: jest.SpyInstance;
        resetTransformation: jest.SpyInstance;
    };

    beforeEach(() => {
        data = JSON.parse(JSON.stringify(originalData));
        defaultProps = { options: data, highlight: false, allowFreeform: true, autoComplete: 'on' };
        CalloutCollisionTransformSpy = {
            preventDismissOnEvent: jest.spyOn(CalloutCollisionTransform.prototype, 'preventDismissOnEvent'),
            applyTransformation: jest.spyOn(CalloutCollisionTransform.prototype, 'applyTransformation'),
            resetTransformation: jest.spyOn(CalloutCollisionTransform.prototype, 'resetTransformation')
        };
        comboboxRef = React.createRef<UIComboBox>();
        const result = render(<UIComboBox ref={comboboxRef} {...defaultProps} />);
        container = result.container;
        rerender = result.rerender;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Test css selectors which are used in scss - main', () => {
        expect(container.querySelectorAll('.ms-ComboBox').length).toEqual(1);
        expect(container.querySelectorAll('.ms-ComboBox .ms-Button--icon i svg').length).toEqual(1);
        openDropdown();
        expect(document.querySelectorAll(menuDropdownSelector).length).toEqual(1);
        expect(document.querySelectorAll(`${menuDropdownSelector} .ms-Callout-main`).length).toBeGreaterThan(0);
        expect(
            document.querySelectorAll(`${menuDropdownSelector} .ms-ComboBox-optionsContainer .ms-Button--command`)
                .length
        ).toBeGreaterThan(0);
        expect(document.querySelectorAll(nonHighlighttItemSelector).length).toBeGreaterThan(0);
        expect(document.querySelectorAll(highlightItemSelector).length).toEqual(0);
    });

    it('Styles - default', () => {
        const styles = getComboBoxProps(comboboxRef)?.styles;
        expect(styles).toMatchInlineSnapshot(
            {},
            `
            Object {
              "__shadowConfig__": Object {
                "__isShadowConfig__": true,
                "inShadow": false,
                "stylesheetKey": "ComboBox",
                "window": [Window],
              },
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
        rerender(<UIComboBox ref={comboboxRef} {...defaultProps} required={true} />);
        const styles = getComboBoxProps(comboboxRef)?.styles;
        expect(styles).toMatchInlineSnapshot(
            {},
            `
            Object {
              "__shadowConfig__": Object {
                "__isShadowConfig__": true,
                "inShadow": false,
                "stylesheetKey": "ComboBox",
                "window": [Window],
              },
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
        `
        );
    });

    describe('Test highlight', () => {
        beforeEach(() => {
            rerender(<UIComboBox ref={comboboxRef} {...defaultProps} highlight={true} />);
        });

        it('Test css selectors which are used in scss - with highlight', () => {
            openDropdown();
            expect(document.querySelectorAll(highlightItemSelector).length).toBeGreaterThan(0);
            expect(document.querySelectorAll(nonHighlighttItemSelector).length).toEqual(0);
        });

        describe('Test on "Keydown"', () => {
            const openMenuOnClickOptions = [true, false, undefined];
            for (const openMenuOnClick of openMenuOnClickOptions) {
                it(`Test on "Keydown" - open callout, "openMenuOnClick=${openMenuOnClick}"`, () => {
                    rerender(
                        <UIComboBox
                            ref={comboboxRef}
                            {...defaultProps}
                            highlight={true}
                            openMenuOnClick={openMenuOnClick}
                        />
                    );
                    const input = container.querySelector('input') as HTMLInputElement;
                    expect(document.querySelectorAll(menuDropdownSelector).length).toEqual(0);
                    fireEvent.keyDown(input, {});
                    expect(document.querySelectorAll(menuDropdownSelector).length).toEqual(1);
                });
            }

            it('Test on "Keydown" - test arrow Cycling', () => {
                const input = container.querySelector('input') as HTMLInputElement;
                expect(document.querySelectorAll(menuDropdownSelector).length).toEqual(0);
                // Open callout
                fireEvent.keyDown(input, { which: KeyCodes.down, keyCode: KeyCodes.down });
                expect(document.querySelectorAll(menuDropdownSelector).length).toEqual(1);
                // First empty option
                expect(document.querySelector('.ts-ComboBox--selected .ts-Menu-option')?.textContent).toEqual('');
                // Test cycling UP - last item should be selected
                fireEvent.keyDown(input, { which: KeyCodes.up, keyCode: KeyCodes.up });
                expect(document.querySelector('.ts-ComboBox--selected .ts-Menu-option')?.textContent).toEqual('Yemen');
                // Test cycling UP - first item should be selected
                fireEvent.keyDown(input, { which: KeyCodes.down, keyCode: KeyCodes.down });
                expect(document.querySelector('.ts-ComboBox--selected .ts-Menu-option')?.textContent).toEqual('');
                // Go one more step down
                fireEvent.keyDown(input, { which: KeyCodes.down, keyCode: KeyCodes.down });
                expect(document.querySelector('.ts-ComboBox--selected .ts-Menu-option')?.textContent).toEqual(
                    'Algeria'
                );
            });

            it(`Test on "Keydown" - keyboard keys, which does not trigger dropdown open`, () => {
                const ignoredOpenKeys = ['Meta', 'Control', 'Shift', 'Tab', 'Alt', 'CapsLock'];
                const input = container.querySelector('input') as HTMLInputElement;

                expect(document.querySelectorAll(menuDropdownSelector).length).toEqual(0);
                for (const ignoredKey of ignoredOpenKeys) {
                    fireEvent.keyDown(input, { key: ignoredKey });
                }
                // None of previously pressed keys should not trigger open for dropdown menu
                expect(document.querySelectorAll(menuDropdownSelector).length).toEqual(0);
                // Trigger with valid key
                fireEvent.keyDown(input, { key: 'a' });
                expect(document.querySelectorAll(menuDropdownSelector).length).toEqual(1);
            });
        });

        it('Test "onInput"', () => {
            const input = container.querySelector('input') as HTMLInputElement;
            fireEvent.keyDown(input, {});
            triggerSearch('Lat');
            expect(document.querySelectorAll('.ts-Menu-option--highlighted').length).toEqual(1);
            expect(document.querySelector('.ts-Menu-option--highlighted')?.textContent).toEqual('Lat');
        });

        it('Test onInput value selection', async () => {
            const requestAnimationFrameSpy = jest.spyOn(window, 'requestAnimationFrame');
            const input = container.querySelector('input') as HTMLInputElement;

            // Set value and cursor in the middle so setCaretPosition detects cursor not at end
            input.value = 'test';
            input.selectionStart = input.selectionEnd = 2;
            fireEvent.input(input);
            // setCaretPosition calls requestAnimationFrame to restore cursor position
            expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(1);
            await new Promise((resolve) => setTimeout(resolve));
            // After rAF fires, cursor is restored to 2
            const selections = input.selectionEnd;
            expect(selections).toBe(2);

            input.value = 'test01';
            input.selectionEnd = input.selectionStart = 2;
            fireEvent.input(input);
            input.selectionEnd = input.selectionStart = 5;
            await new Promise((resolve) => setTimeout(resolve));
            expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(2);
            expect((input as HTMLInputElement).selectionEnd).toBe(2);
        });

        it('Test onClick value selection', async () => {
            rerender(<UIComboBox ref={comboboxRef} {...defaultProps} highlight={true} selectedKey="AU" />);
            const input = container.querySelector('input') as HTMLInputElement;

            // Directly test the setCaretPosition behavior via a simulated click event
            // that uses the actual DOM input as target (mimicking original Enzyme test)
            input.selectionEnd = input.selectionStart = 2;
            const event = {
                target: input
            } as unknown as React.FormEvent<IComboBox>;
            // Call UIComboBox.onClick directly via the component instance
            (comboboxRef.current as unknown as { onClick: (e: React.FormEvent<IComboBox>) => void }).onClick(event);
            input.selectionEnd = input.selectionStart = 5;
            await new Promise((resolve) => setTimeout(resolve));
            expect((input as HTMLInputElement).selectionEnd).toBe(2);
        });

        it('Test "reserQuery"', () => {
            const input = container.querySelector('input') as HTMLInputElement;
            openDropdown();
            triggerSearch('Au');
            expect(document.querySelectorAll(menuDropdownSelector).length).toEqual(1);
            let hiddenItemsExist = comboboxRef.current?.props.options.some((option) => {
                return option.hidden;
            });
            expect(hiddenItemsExist).toEqual(true);
            // Close callout
            fireEvent.keyDown(input, { which: KeyCodes.escape });
            expect(document.querySelectorAll(menuDropdownSelector).length).toEqual(0);
            hiddenItemsExist = comboboxRef.current?.props.options.some((option) => {
                return option.hidden;
            });
            expect(hiddenItemsExist).toEqual(false);
        });

        it('Test list visibility', () => {
            expect(comboboxRef.current?.state.isListHidden).toBeFalsy();
            const input = container.querySelector('input') as HTMLInputElement;
            fireEvent.keyDown(input, {});
            triggerSearch('Lat');
            // List should be visible - there is some occurrences
            expect(comboboxRef.current?.state.isListHidden).toBeFalsy();
            // List should be hidden - there any occurrence
            triggerSearch('404');
            expect(comboboxRef.current?.state.isListHidden).toBeTruthy();
        });

        it('Search hidden option - option should not be found', () => {
            rerender(
                <UIComboBox
                    ref={comboboxRef}
                    {...defaultProps}
                    highlight={true}
                    options={data.map((option) => ({
                        ...option,
                        hidden: option.key === 'EE'
                    }))}
                />
            );
            const input = container.querySelector('input') as HTMLInputElement;
            fireEvent.keyDown(input, {});
            triggerSearch('Est');
            expect(document.querySelectorAll('.ts-Menu-option--highlighted').length).toEqual(0);
        });
    });

    it('Test "useComboBoxAsMenuMinWidth"', () => {
        expect(comboboxRef.current?.state.minWidth).toEqual(undefined);
        const newRef = React.createRef<UIComboBox>();
        const { container: c2 } = render(
            <UIComboBox
                ref={newRef}
                options={data}
                highlight={false}
                allowFreeform={true}
                autoComplete="on"
                useComboBoxAsMenuMinWidth={true}
            />
        );
        const btn = c2.querySelector('.ms-ComboBox .ms-Button--icon') as HTMLElement;
        fireEvent.click(btn, document.createEvent('Events'));
        // I would like to add more check, but can not access private variables
        expect(newRef.current?.state.minWidth).toEqual(0);
    });

    it('Test menu close method', () => {
        const newRef = React.createRef<UIComboBox>();
        const { container: c2 } = render(
            <UIComboBox
                ref={newRef}
                options={data}
                highlight={true}
                allowFreeform={true}
                autoComplete="on"
                useComboBoxAsMenuMinWidth={true}
            />
        );
        expect(document.querySelectorAll(menuDropdownSelector).length).toEqual(0);
        // Open callout
        const btn = c2.querySelector('.ms-ComboBox .ms-Button--icon') as HTMLElement;
        fireEvent.click(btn, document.createEvent('Events'));
        expect(document.querySelectorAll(menuDropdownSelector).length).toEqual(1);
        act(() => {
            newRef.current?.dismissMenu();
        });
        expect(document.querySelectorAll(menuDropdownSelector).length).toEqual(0);
    });

    describe('Multiselect', () => {
        it('No filtration', () => {
            let keys: Array<string | number> = [];
            const onChange = jest
                .fn()
                .mockImplementation((event: React.FormEvent<IComboBox>, option?: IComboBoxOption | undefined) => {
                    keys = [...keys, option!.key].filter((k) => (option!.selected ? true : k !== option!.key));
                });

            const newRef = React.createRef<UIComboBox>();
            const { container: c2, rerender: rerenderMulti } = render(
                <UIComboBox
                    ref={newRef}
                    options={data}
                    highlight={true}
                    allowFreeform={true}
                    multiSelect={true}
                    autoComplete="on"
                    useComboBoxAsMenuMinWidth={true}
                    selectedKey={keys}
                    onChange={onChange}
                />
            );
            expect(document.querySelectorAll(menuDropdownSelector).length).toEqual(0);
            // Open callout
            const btn = c2.querySelector('.ms-ComboBox .ms-Button--icon') as HTMLElement;
            fireEvent.click(btn, document.createEvent('Events'));
            expect(document.querySelectorAll(menuDropdownSelector).length).toEqual(1);
            // select some options - fire change on the inner checkbox input elements
            const options = document.querySelectorAll('.ms-Checkbox.is-enabled.ms-ComboBox-option');
            expect(options.length).toBeGreaterThan(0);
            const checkbox1 = options[1].querySelector('input[type="checkbox"]') as HTMLInputElement;
            const checkbox2 = options[2].querySelector('input[type="checkbox"]') as HTMLInputElement;
            fireEvent.click(checkbox1);
            fireEvent.click(checkbox2);

            rerenderMulti(
                <UIComboBox
                    ref={newRef}
                    options={data}
                    highlight={true}
                    allowFreeform={true}
                    multiSelect={true}
                    autoComplete="on"
                    useComboBoxAsMenuMinWidth={true}
                    selectedKey={keys}
                    onChange={onChange}
                />
            );

            expect(onChange).toHaveBeenCalledTimes(2);
            expect(onChange.mock.calls.map((parms) => parms[1].key)).toMatchInlineSnapshot(`
                Array [
                  "DZ",
                  "AR",
                ]
            `);

            const selectedOptions = document.querySelectorAll('.ms-Checkbox.is-checked.ms-ComboBox-option');
            expect(selectedOptions.length).toBe(2);
        });

        it('With filter and changes in options', () => {
            let keys: Array<string | number> = [];
            const onChange = jest
                .fn()
                .mockImplementation((event: React.FormEvent<IComboBox>, option?: IComboBoxOption | undefined) => {
                    keys = [...keys, option!.key].filter((k) => (option!.selected ? true : k !== option!.key));
                });

            const newRef = React.createRef<UIComboBox>();
            const { container: c2, rerender: rerenderMulti } = render(
                <UIComboBox
                    ref={newRef}
                    options={data}
                    highlight={true}
                    allowFreeform={true}
                    multiSelect={true}
                    autoComplete="on"
                    useComboBoxAsMenuMinWidth={true}
                    selectedKey={keys}
                    onChange={onChange}
                />
            );

            expect(document.querySelectorAll(menuDropdownSelector).length).toEqual(0);
            const query = 'Lat';
            const input = c2.querySelector('input') as HTMLInputElement;
            fireEvent.keyDown(input, {});
            fireEvent.input(input, {
                target: getInputTarget(query)
            });
            expect(document.querySelectorAll('.ts-Menu-option--highlighted').length).toEqual(1);
            expect(document.querySelector('.ts-Menu-option--highlighted')?.textContent).toEqual(query);

            // select some options - fire change on the inner checkbox input element
            const options = document.querySelectorAll('.ms-Checkbox.is-enabled.ms-ComboBox-option');
            expect(options.length).toBeGreaterThan(0);
            const checkbox1 = options[0].querySelector('input[type="checkbox"]') as HTMLInputElement;
            fireEvent.click(checkbox1);

            rerenderMulti(
                <UIComboBox
                    ref={newRef}
                    options={[...data]}
                    highlight={true}
                    allowFreeform={true}
                    multiSelect={true}
                    autoComplete="on"
                    useComboBoxAsMenuMinWidth={true}
                    selectedKey={keys}
                    onChange={onChange}
                />
            );
            expect(onChange).toHaveBeenCalledTimes(1);
            expect(onChange.mock.calls.map((parms) => parms[1].key)).toMatchInlineSnapshot(`
                Array [
                  "LV",
                ]
            `);

            const selectedOptions = document.querySelectorAll('.ms-Checkbox.is-checked.ms-ComboBox-option');
            expect(selectedOptions.length).toBe(1);
        });
    });

    describe('onScrollToItem - multi select combobox', () => {
        const testCases = [
            {
                scrollHeight: 2000,
                clientHeight: 200,
                scrollTop: 50,
                element: {
                    offsetTop: 500,
                    clientHeight: 50
                },
                expect: 350
            },
            {
                scrollHeight: 2000,
                clientHeight: 200,
                scrollTop: 1500,
                element: {
                    offsetTop: 500,
                    clientHeight: 50
                },
                expect: 500
            },
            {
                scrollHeight: 2000,
                clientHeight: 200,
                scrollTop: 0,
                element: {
                    offsetTop: 100,
                    clientHeight: 50
                },
                expect: undefined
            },
            // Single select should not invoke solutin for fix, because there no issue in single select combobox
            {
                singleSelect: true,
                scrollHeight: 2000,
                clientHeight: 200,
                scrollTop: 1500,
                element: {
                    offsetTop: 500,
                    clientHeight: 50
                },
                expect: undefined
            }
        ];
        for (const testCase of testCases) {
            it('Scroll to selection', async () => {
                const parent = document.createElement('div');
                jest.spyOn(parent, 'scrollHeight', 'get').mockReturnValue(testCase.scrollHeight);
                jest.spyOn(parent, 'clientHeight', 'get').mockReturnValue(testCase.clientHeight);
                jest.spyOn(parent, 'scrollTop', 'get').mockReturnValue(testCase.scrollTop);
                const scrollTopSetter = jest.spyOn(parent, 'scrollTop', 'set');
                jest.spyOn(HTMLElement.prototype, 'offsetParent', 'get').mockReturnValue(parent);
                const scrollRef = React.createRef<UIComboBox>();
                const { container: c2 } = render(
                    <UIComboBox
                        ref={scrollRef}
                        options={data}
                        highlight={true}
                        allowFreeform={true}
                        multiSelect={!testCase.singleSelect}
                        autoComplete="on"
                        useComboBoxAsMenuMinWidth={true}
                    />
                );
                const comboBoxProps = getComboBoxProps(scrollRef);
                const onScrollToItem = comboBoxProps?.onScrollToItem as ((index: number) => void) | undefined;
                if (testCase.singleSelect) {
                    // Single select should not invoke solutin for fix, because there no issue in single select combobox
                    expect(onScrollToItem).toBeUndefined();
                    return;
                }
                // Open callout
                const btn = c2.querySelector('.ms-ComboBox .ms-Button--icon') as HTMLElement;
                fireEvent.click(btn, document.createEvent('Events'));
                const input = c2.querySelector(inputSelector) as HTMLInputElement;
                fireEvent.keyDown(input, { which: KeyCodes.down, keyCode: KeyCodes.down });
                // Mock element - ts-ComboBox--selected is rendered when an item is focused
                const element = document.querySelector('.ts-ComboBox--selected') as HTMLElement;
                jest.spyOn(element, 'offsetTop', 'get').mockReturnValue(testCase.element.offsetTop);
                jest.spyOn(element, 'clientHeight', 'get').mockReturnValue(testCase.element.clientHeight);
                // Simulate navigation
                onScrollToItem(5);
                // Check result
                expect(scrollTopSetter).toHaveBeenCalledTimes(testCase.expect ? 1 : 0);
                if (testCase.expect !== undefined) {
                    expect(scrollTopSetter).toHaveBeenCalledWith(testCase.expect);
                }
            });
        }
    });

    describe('Error message', () => {
        it('Error', () => {
            rerender(<UIComboBox ref={comboboxRef} {...defaultProps} errorMessage="dummy" />);
            expect(container.querySelectorAll('.ts-ComboBox--error').length).toEqual(1);
            expect(container.querySelectorAll('.ts-ComboBox--warning').length).toEqual(0);
            expect(container.querySelectorAll('.ts-ComboBox--info').length).toEqual(0);
        });

        it('Warning', () => {
            rerender(<UIComboBox ref={comboboxRef} {...defaultProps} warningMessage="dummy" />);
            expect(container.querySelectorAll('.ts-ComboBox--error').length).toEqual(0);
            expect(container.querySelectorAll('.ts-ComboBox--warning').length).toEqual(1);
            expect(container.querySelectorAll('.ts-ComboBox--info').length).toEqual(0);
        });

        it('Info', () => {
            rerender(<UIComboBox ref={comboboxRef} {...defaultProps} infoMessage="dummy" />);
            expect(container.querySelectorAll('.ts-ComboBox--error').length).toEqual(0);
            expect(container.querySelectorAll('.ts-ComboBox--warning').length).toEqual(0);
            expect(container.querySelectorAll('.ts-ComboBox--info').length).toEqual(1);
        });
    });

    describe('Behavior of title/tooltip for options', () => {
        const buttonSelector = `${menuDropdownSelector} .ms-Button--command`;
        it('Default - inherit from text', () => {
            rerender(<UIComboBox ref={comboboxRef} {...defaultProps} highlight={true} options={originalData} />);
            openDropdown();
            const buttons = document.querySelectorAll(buttonSelector);
            expect(buttons[buttons.length - 1].getAttribute('title')).toEqual('Yemen');
        });

        it('Custom title', () => {
            const expectTitle = 'dummy';
            const dataTemp = JSON.parse(JSON.stringify(originalData));
            dataTemp[dataTemp.length - 1].title = expectTitle;
            rerender(<UIComboBox ref={comboboxRef} {...defaultProps} highlight={true} options={dataTemp} />);
            openDropdown();
            const buttons = document.querySelectorAll(buttonSelector);
            expect(buttons[buttons.length - 1].getAttribute('title')).toEqual(expectTitle);
        });

        it('No title', () => {
            const dataTemp = JSON.parse(JSON.stringify(originalData));
            dataTemp[dataTemp.length - 1].title = null;
            rerender(<UIComboBox ref={comboboxRef} {...defaultProps} highlight={true} options={dataTemp} />);
            openDropdown();
            const buttons = document.querySelectorAll(buttonSelector);
            expect(buttons[buttons.length - 1].getAttribute('title')).toEqual(null);
        });
    });

    describe('Test "openMenuOnClick" property', () => {
        const testCases = [
            {
                value: true,
                expectOpen: true
            },
            {
                value: undefined,
                expectOpen: true
            },
            {
                value: false,
                expectOpen: false
            }
        ];
        for (const testCase of testCases) {
            it(`Click on input, "openMenuOnClick=${testCase.value}"`, () => {
                rerender(<UIComboBox ref={comboboxRef} {...defaultProps} openMenuOnClick={testCase.value} />);
                const input = container.querySelector('input') as HTMLInputElement;
                expect(document.querySelectorAll(menuDropdownSelector).length).toEqual(0);
                fireEvent.click(input);
                expect(document.querySelectorAll(menuDropdownSelector).length).toEqual(testCase.expectOpen ? 1 : 0);
            });
        }
    });

    describe('Test "isForceEnabled" property', () => {
        const testCases = [true, false];
        for (const testCase of testCases) {
            it(`isForceEnabled=${testCase}`, () => {
                rerender(<UIComboBox ref={comboboxRef} {...defaultProps} options={[]} isForceEnabled={testCase} />);
                const props = getComboBoxProps(comboboxRef);
                expect(props?.disabled).toEqual(!testCase);
            });
        }
    });

    it('Test "disabled" property', () => {
        rerender(<UIComboBox ref={comboboxRef} {...defaultProps} disabled={true} />);
        const input = container.querySelector(inputSelector) as HTMLInputElement;
        // disabled prop maps to readOnly=true and aria-disabled=true (not actual HTML disabled)
        expect(input.disabled).toBeFalsy();
        expect(input.readOnly).toEqual(true);
        expect(input.getAttribute('tabindex')).toEqual(null);
        expect(input.getAttribute('aria-disabled')).toEqual('true');
    });

    describe('Test "aria-invalid" set according to error message', () => {
        it('No Error case', () => {
            const input = container.querySelector(inputSelector) as HTMLInputElement;
            expect(input.hasAttribute('aria-invalid')).toEqual(true);
            expect(input.getAttribute('aria-invalid')).toEqual('false');
        });

        it('Error case', () => {
            rerender(<UIComboBox ref={comboboxRef} {...defaultProps} errorMessage="dummy" />);
            const input = container.querySelector(inputSelector) as HTMLInputElement;
            expect(input.hasAttribute('aria-invalid')).toEqual(true);
            expect(input.getAttribute('aria-invalid')).toEqual('true');
        });
    });

    describe('Test "readonly" property', () => {
        const testCases = [
            {
                readOnly: true,
                expected: {
                    readOnly: true,
                    tabIndex: undefined
                }
            },
            {
                readOnly: true,
                tabIndex: 4,
                expected: {
                    readOnly: true,
                    tabIndex: 4
                }
            },
            {
                readOnly: true,
                disabled: true,
                expected: {
                    readOnly: true,
                    tabIndex: undefined
                }
            },
            {
                readOnly: undefined,
                expected: {
                    readOnly: false,
                    tabIndex: undefined
                }
            },
            {
                readOnly: false,
                expected: {
                    readOnly: false,
                    tabIndex: undefined
                }
            }
        ];
        for (const testCase of testCases) {
            it(`"readOnly=${testCase.readOnly}", "tabIndex=${testCase.tabIndex}", "disabled=${testCase.disabled}"`, () => {
                const { expected } = testCase;
                rerender(
                    <UIComboBox
                        ref={comboboxRef}
                        {...defaultProps}
                        readOnly={testCase.readOnly}
                        {...(testCase.tabIndex !== undefined && { tabIndex: testCase.tabIndex })}
                        {...(testCase.disabled !== undefined && { disabled: testCase.disabled })}
                    />
                );
                const input = container.querySelector(inputSelector) as HTMLInputElement;
                expect(input).not.toBeNull();
                expect(input.readOnly).toEqual(expected.readOnly);
                // tabIndex: RTL exposes tabindex attribute as string or missing
                const tabIndexAttr = input.getAttribute('tabindex');
                const tabIndexValue = tabIndexAttr !== null ? Number(tabIndexAttr) : undefined;
                expect(tabIndexValue).toEqual(expected.tabIndex);

                const className = container.querySelector('.ts-ComboBox')?.getAttribute('class') ?? '';
                expect(className.includes('ts-ComboBox--readonly')).toEqual(
                    !testCase.disabled ? !!expected.readOnly : false
                );
                expect(className.includes('ts-ComboBox--disabled')).toEqual(!!testCase.disabled);
                // Additional properties
                if (!testCase.disabled && expected.readOnly) {
                    // When readOnly is set: aria-readonly=true, aria-disabled is explicitly undefined (not rendered)
                    expect(input.getAttribute('aria-readonly')).toEqual('true');
                    // aria-disabled is set to undefined in props - React does not render it as a DOM attribute
                    expect(input.getAttribute('aria-disabled')).toEqual(null);
                } else {
                    expect(input.hasAttribute('aria-readonly')).toEqual(false);
                    expect(input.getAttribute('aria-disabled')).toEqual(testCase.disabled ? 'true' : 'false');
                }
            });
        }
    });

    describe('Empty combobox classname', () => {
        const testCases = [
            {
                text: undefined,
                selectedKey: 'EE',
                expected: false
            },
            {
                text: undefined,
                selectedKey: ['EE'],
                expected: false
            },
            {
                text: 'Dummy',
                selectedKey: undefined,
                expected: false
            },
            {
                text: undefined,
                selectedKey: undefined,
                expected: true
            },
            {
                text: undefined,
                selectedKey: [],
                expected: true
            }
        ];
        for (const testCase of testCases) {
            it(`"text=${testCase.text}", "selectedKey=${
                Array.isArray(testCase.selectedKey) ? JSON.stringify(testCase.selectedKey) : testCase.selectedKey
            }"`, () => {
                rerender(
                    <UIComboBox
                        ref={comboboxRef}
                        {...defaultProps}
                        text={testCase.text}
                        selectedKey={testCase.selectedKey as UIComboBoxProps['selectedKey']}
                    />
                );
                expect(container.querySelectorAll('div.ts-ComboBox--empty').length).toEqual(testCase.expected ? 1 : 0);
            });
        }
    });

    describe('Combobox items with group headers', () => {
        beforeEach(() => {
            rerender(<UIComboBox ref={comboboxRef} {...defaultProps} highlight={true} options={groupsData} />);
        });

        it('Test css selectors which are used in scss - with highlight', () => {
            openDropdown();
            expect(document.querySelectorAll(headerItemSelector).length).toEqual(7);
            // Search items and hide group header if no matching children
            const input = container.querySelector('input') as HTMLInputElement;
            fireEvent.keyDown(input, {});
            triggerSearch('Est');
            expect(document.querySelectorAll(headerItemSelector).length).toEqual(1);
            expect(document.querySelector(headerItemSelector)?.textContent).toEqual('Europe');
            // Search and match first group
            triggerSearch('gypt');
            expect(document.querySelectorAll(headerItemSelector).length).toEqual(1);
            expect(document.querySelector(headerItemSelector)?.textContent).toEqual('Africa');
            // Search and match last group
            triggerSearch('dumy');
            expect(document.querySelectorAll(headerItemSelector).length).toEqual(1);
            expect(document.querySelector(headerItemSelector)?.textContent).toEqual('Unknown');
            // Search and match multiple groups
            triggerSearch('la');
            expect(document.querySelectorAll(headerItemSelector).length).toEqual(3);
            // Search without matching
            triggerSearch('404');
            expect(document.querySelectorAll(headerItemSelector).length).toEqual(0);
            // Reset search
            triggerSearch('');
            expect(document.querySelectorAll(headerItemSelector).length).toEqual(7);
        });
    });

    it('Handle "onPendingValueChanged"', () => {
        const onPendingValueChanged = jest.fn();
        rerender(
            <UIComboBox
                ref={comboboxRef}
                {...defaultProps}
                highlight={true}
                options={data.map((option) => ({
                    ...option,
                    hidden: option.key !== 'LV'
                }))}
                onPendingValueChanged={onPendingValueChanged}
            />
        );
        expect(document.querySelectorAll(menuDropdownSelector).length).toEqual(0);
        // Open callout
        expect(onPendingValueChanged).not.toHaveBeenCalled();
        const input = container.querySelector('input') as HTMLInputElement;
        fireEvent.keyDown(input, { which: KeyCodes.down, keyCode: KeyCodes.down });
        expect(onPendingValueChanged).toHaveBeenCalled();
        const callArgs = onPendingValueChanged.mock.calls[0];
        expect(callArgs[0].key).toEqual('LV');
        expect(callArgs[1]).toEqual(35);
    }, 99999);

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
                rerender(
                    <UIComboBox
                        ref={comboboxRef}
                        {...defaultProps}
                        multiSelect={testCase.multiSelect}
                        calloutCollisionTransformation={testCase.enabled}
                    />
                );
                const props = getComboBoxProps(comboboxRef);
                expect(props).toBeTruthy();
                const calloutProps = props?.calloutProps as Record<string, unknown> | undefined;
                if (expected) {
                    expect(calloutProps?.preventDismissOnEvent).toBeDefined();
                    expect(
                        (calloutProps?.layerProps as Record<string, unknown> | undefined)?.onLayerDidMount
                    ).toBeDefined();
                    expect(
                        (calloutProps?.layerProps as Record<string, unknown> | undefined)?.onLayerWillUnmount
                    ).toBeDefined();

                    (calloutProps?.preventDismissOnEvent as (e: Event) => void)?.({} as Event);
                    (calloutProps?.layerProps as { onLayerDidMount?: () => void } | undefined)?.onLayerDidMount?.();
                    (
                        calloutProps?.layerProps as { onLayerWillUnmount?: () => void } | undefined
                    )?.onLayerWillUnmount?.();
                    expect(CalloutCollisionTransformSpy.preventDismissOnEvent).toHaveBeenCalledTimes(expected ? 1 : 0);
                    expect(CalloutCollisionTransformSpy.applyTransformation).toHaveBeenCalledTimes(expected ? 1 : 0);
                    expect(CalloutCollisionTransformSpy.resetTransformation).toHaveBeenCalledTimes(expected ? 1 : 0);
                } else {
                    expect(calloutProps?.preventDismissOnEvent).toBeUndefined();
                    expect(
                        (calloutProps?.layerProps as Record<string, unknown> | undefined)?.onLayerDidMount
                    ).toBeUndefined();
                    expect(
                        (calloutProps?.layerProps as Record<string, unknown> | undefined)?.onLayerWillUnmount
                    ).toBeUndefined();
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
            rerender(
                <UIComboBox
                    ref={comboboxRef}
                    {...defaultProps}
                    multiSelect={true}
                    calloutCollisionTransformation={true}
                    {...externalListeners}
                />
            );
            const props = getComboBoxProps(comboboxRef);
            const calloutProps = props?.calloutProps as Record<string, unknown> | undefined;

            (calloutProps?.preventDismissOnEvent as (e: Event) => void)?.({} as Event);
            (calloutProps?.layerProps as { onLayerDidMount?: () => void } | undefined)?.onLayerDidMount?.();
            (calloutProps?.layerProps as { onLayerWillUnmount?: () => void } | undefined)?.onLayerWillUnmount?.();
            expect(CalloutCollisionTransformSpy.preventDismissOnEvent).toHaveBeenCalledTimes(1);
            expect(CalloutCollisionTransformSpy.applyTransformation).toHaveBeenCalledTimes(1);
            expect(CalloutCollisionTransformSpy.resetTransformation).toHaveBeenCalledTimes(1);
            expect(externalListeners.calloutProps.preventDismissOnEvent).toHaveBeenCalledTimes(1);
            expect(externalListeners.calloutProps.layerProps.onLayerDidMount).toHaveBeenCalledTimes(1);
            expect(externalListeners.calloutProps.layerProps.onLayerWillUnmount).toHaveBeenCalledTimes(1);
        });
    });

    describe('Test "isLoading" property', () => {
        const testCases = [
            {
                isLoading: undefined,
                expectLoaderInInput: false,
                expectLoaderInMenu: false
            },
            {
                isLoading: true,
                expectLoaderInInput: false,
                expectLoaderInMenu: true
            },
            {
                isLoading: [UIComboBoxLoaderType.Input],
                expectLoaderInInput: true,
                expectLoaderInMenu: false
            },
            {
                isLoading: [UIComboBoxLoaderType.List],
                expectLoaderInInput: false,
                expectLoaderInMenu: true
            },
            {
                isLoading: [UIComboBoxLoaderType.Input, UIComboBoxLoaderType.List],
                expectLoaderInInput: true,
                expectLoaderInMenu: true
            }
        ];
        test.each(testCases)('isLoading = $isLoading', ({ isLoading, expectLoaderInInput, expectLoaderInMenu }) => {
            rerender(
                <UIComboBox ref={comboboxRef} {...defaultProps} isLoading={isLoading as UIComboBoxProps['isLoading']} />
            );
            openDropdown();
            // Check loader in menu (Callout)
            const callout = document.querySelector('.ms-Callout');
            const loaderInMenu = callout ? callout.querySelectorAll('.ms-Spinner').length : 0;
            expect(loaderInMenu).toEqual(expectLoaderInMenu ? 1 : 0);
            // Check loader in input (ComboBox wrapper)
            const comboBoxWrapper = container.querySelector('.ms-ComboBox');
            const loaderInInput = comboBoxWrapper ? comboBoxWrapper.querySelectorAll('.ms-Spinner').length : 0;
            expect(loaderInInput).toEqual(expectLoaderInInput ? 1 : 0);
        });
    });

    it('Custom renderers for "onRenderOption"', () => {
        rerender(
            <UIComboBox
                ref={comboboxRef}
                {...defaultProps}
                highlight={true}
                onRenderOption={(
                    props?: UIComboBoxOption,
                    defaultRender?: (props?: UIComboBoxOption) => JSX.Element | null
                ) => {
                    return <div className="custom-render-option">{defaultRender?.(props)}</div>;
                }}
            />
        );
        openDropdown();
        expect(document.querySelectorAll('.custom-render-option').length).toBeGreaterThan(0);
        expect(document.querySelectorAll(highlightItemSelector).length).toBeGreaterThan(0);
    });

    it('Custom renderers for "onRenderItem"', () => {
        rerender(
            <UIComboBox
                ref={comboboxRef}
                {...defaultProps}
                options={JSON.parse(JSON.stringify(originalData))}
                highlight={true}
                selectedKey="AR"
                onRenderItem={(
                    props?: UIComboBoxOption,
                    defaultRender?: (props?: UIComboBoxOption) => JSX.Element | null
                ) => {
                    return <div className="custom-render-item">{defaultRender?.(props)}</div>;
                }}
            />
        );
        openDropdown();
        expect(document.querySelectorAll('.custom-render-item').length).toBeGreaterThan(0);
        expect(document.querySelectorAll('.ts-ComboBox--selected').length).toBeGreaterThan(0);
    });

    it('Test "calloutProps"', () => {
        rerender(
            <UIComboBox
                ref={comboboxRef}
                {...defaultProps}
                calloutProps={{
                    className: 'dummy'
                }}
            />
        );
        openDropdown();
        expect(document.querySelectorAll('div.dummy').length).toEqual(1);
    });

    describe('Test "searchByKeyEnabled" property', () => {
        let searchKeysData: UIComboBoxOption[] = [];
        beforeEach(() => {
            searchKeysData = [
                { 'key': 'test1', 'text': 'test1' },
                { 'key': 'dummy', 'text': 'dummy' },
                { 'key': 'customer', 'text': 'customer' },
                { 'key': 'name', 'text': 'name' },
                { 'key': 'employee', 'text': 'employee' },
                { 'key': 'ID', 'text': 'ID' },
                { 'key': 'tripEndDate', 'text': 'tripEndDate' },
                { 'key': 'bookings', 'text': 'bookings', 'itemType': UISelectableOptionMenuItemType.Divider },
                { 'key': 'bookings', 'text': 'bookings', 'itemType': UISelectableOptionMenuItemType.Header },
                { 'key': 'bookings/airlines', 'text': 'airlines' },
                { 'key': 'bookings/bookingDate', 'text': 'bookingDate' },
                { 'key': 'bookings/DateOnBookings', 'text': 'DateOnBookings' },
                { 'key': 'bookings/employee', 'text': 'employee' },
                { 'key': 'bookings/flightDate', 'text': 'flightDate' },
                { 'key': 'bookings/ID', 'text': 'ID' },
                { 'key': 'bookings/priceUSD', 'text': 'priceUSD' },
                { 'key': 'bookings/travel_ID', 'text': 'travel_ID' },
                { 'key': 'bookings/usedString5', 'text': 'usedString5' },
                { 'key': 'notes', 'text': 'notes', 'itemType': UISelectableOptionMenuItemType.Divider },
                { 'key': 'notes', 'text': 'notes', 'itemType': UISelectableOptionMenuItemType.Header },
                { 'key': 'notes/comment', 'text': 'comment' },
                { 'key': 'notes/description', 'text': 'description' }
            ];
        });
        const testCases = [
            {
                name: '"searchByKeyEnabled" is undefined',
                searchByKeyEnabled: undefined,
                expectedCount: 2
            },
            {
                name: '"searchByKeyEnabled" is false',
                searchByKeyEnabled: false,
                expectedCount: 2
            },
            {
                name: '"searchByKeyEnabled" is true',
                searchByKeyEnabled: true,
                expectedCount: 10
            }
        ];
        for (const testCase of testCases) {
            const { name, searchByKeyEnabled, expectedCount } = testCase;
            it(name, () => {
                const query = 'bookings';
                rerender(
                    <UIComboBox
                        ref={comboboxRef}
                        {...defaultProps}
                        highlight={true}
                        options={searchKeysData}
                        searchByKeyEnabled={searchByKeyEnabled}
                    />
                );
                openDropdown();
                const input = container.querySelector('input') as HTMLInputElement;
                fireEvent.keyDown(input, {});
                triggerSearch(query);
                expect(document.querySelectorAll('.ms-Button').length).toEqual(expectedCount);
            });
        }
    });

    describe('Test "customSearchFilter" property', () => {
        const dataForCustomSearch = [
            ...data,
            {
                key: 'A1',
                text: 'Do not hide',
                customMark: true
            },
            {
                key: 'A2',
                text: 'Always visible',
                customMark: true
            }
        ];
        const testCases = [
            {
                name: 'Test "true" and "undefined" result from custom filter',
                options: dataForCustomSearch,
                query: 'Australia',
                expectedCountBefore: 1,
                expectedCountAfter: 3
            },
            {
                name: 'Test "true" result from custom filter when no default matches',
                options: dataForCustomSearch,
                query: '404',
                expectedCountBefore: 0,
                expectedCountAfter: 2
            },
            {
                name: 'Test "false" result from custom filter',
                options: JSON.parse(JSON.stringify(originalData)),
                query: 'Lorem ipsum dolor sit amet',
                expectedCountBefore: 1,
                expectedCountAfter: 0
            }
        ];
        for (const testCase of testCases) {
            const { name, query, expectedCountBefore, expectedCountAfter, options } = testCase;
            it(name, () => {
                // Default state before custom filter
                rerender(<UIComboBox ref={comboboxRef} {...defaultProps} highlight={true} options={options} />);
                openDropdown();
                const input = container.querySelector('input') as HTMLInputElement;
                fireEvent.keyDown(input, {});
                triggerSearch(query);
                expect(document.querySelectorAll('.ms-Button--action').length).toEqual(expectedCountBefore);
                // Apply custom filter and check result for same query
                rerender(
                    <UIComboBox
                        ref={comboboxRef}
                        {...defaultProps}
                        highlight={true}
                        options={options}
                        customSearchFilter={(searchTerm: string, option: UIComboBoxOption) => {
                            if (
                                'customMark' in option &&
                                (option as UIComboBoxOption & { customMark?: boolean }).customMark
                            ) {
                                return true;
                            }
                            if (option.key === 'BC') {
                                // Hide 'Lorem ipsum dolor sit amet' when searching
                                return false;
                            }
                            return undefined;
                        }}
                    />
                );
                openDropdown();
                fireEvent.keyDown(input, {});
                triggerSearch(query);
                expect(document.querySelectorAll('.ms-Button--action').length).toEqual(expectedCountAfter);
            });
        }
    });

    describe('externalSearchProps', () => {
        const selectors = {
            noDataText: '.option-no-data'
        };
        beforeEach(() => {
            rerender(<UIComboBox ref={comboboxRef} {...defaultProps} options={[]} isForceEnabled={true} />);
        });

        it('Check "noDataLabel"', () => {
            const noDataLabel = 'Dummy text';
            rerender(
                <UIComboBox
                    ref={comboboxRef}
                    {...defaultProps}
                    options={[]}
                    isForceEnabled={true}
                    externalSearchProps={{
                        noDataLabel,
                        onExternalSearch: jest.fn()
                    }}
                />
            );
            openDropdown();
            expect(document.querySelectorAll(selectors.noDataText).length).toEqual(1);
            expect(document.querySelector(selectors.noDataText)?.textContent).toEqual(noDataLabel);
        });

        it('Handle "onInputChange" and "onExternalSearch"', async () => {
            const noDataLabel = 'Dummy text';
            const onInputChange = jest.fn();
            const onExternalSearch = jest.fn();
            const { container: c2 } = render(
                <UIComboBox
                    options={[]}
                    highlight={true}
                    allowFreeform={true}
                    autoComplete="on"
                    isForceEnabled={true}
                    externalSearchProps={{
                        noDataLabel,
                        onInputChange,
                        onExternalSearch,
                        debounceTime: 10
                    }}
                />
            );
            const input = c2.querySelector('input') as HTMLInputElement;
            fireEvent.input(input, { target: { value: 'My' } });
            fireEvent.input(input, { target: { value: 'My dummy' } });
            fireEvent.input(input, { target: { value: 'My dummy value' } });
            await new Promise((resolve) => setTimeout(resolve, 20));
            expect(onInputChange).toHaveBeenCalledTimes(3);
            expect(onExternalSearch).toHaveBeenCalledTimes(1);
            expect(onExternalSearch).toHaveBeenCalledWith('My dummy value');
        });
    });
});
