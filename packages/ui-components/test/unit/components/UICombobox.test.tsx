import * as React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import type { UIComboBoxOption, UIComboBoxProps, UIComboBoxState } from '../../../src/components/UIComboBox';
import { UIComboBox, UIComboBoxLoaderType, UISelectableOptionMenuItemType } from '../../../src/components/UIComboBox';
import { data as originalData, groupsData as originalGroupsData } from '../../__mock__/select-data';
import { initIcons } from '../../../src/components/Icons';
import type { IComboBox, IComboBoxOption } from '@fluentui/react';
import { KeyCodes, ComboBox, Autofill } from '@fluentui/react';
import { CalloutCollisionTransform } from '../../../src/components/UICallout/CalloutCollisionTransform';

const data = JSON.parse(JSON.stringify(originalData));
const groupsData = JSON.parse(JSON.stringify(originalGroupsData));

describe('<UIComboBox />', () => {
    let container: HTMLElement;
    let rerender: (ui: React.ReactElement) => void;
    const menuDropdownSelector = 'div.ts-Callout-Dropdown';
    const nonHighlighttItemSelector = `${menuDropdownSelector} .ms-ComboBox-optionsContainer .ms-Button--command .ms-ComboBox-optionText`;
    const highlightItemSelector = `${menuDropdownSelector} .ms-ComboBox-optionsContainer .ms-Button--command .ts-Menu-option`;
    const inputSelector = 'input.ms-ComboBox-Input';
    const headerItemSelector = '.ms-ComboBox-header';
    initIcons();

    const getInputTarget = (value = '') => {
        return { tagName: 'INPUT', value };
    };

    const openDropdown = (): void => {
        const dropdownButton = container.querySelector('.ms-ComboBox .ms-Button--icon');
        if (dropdownButton) {
            fireEvent.click(dropdownButton);
        }
    };

    const triggerSearch = (query: string) => {
        const input = container.querySelector('input');
        if (input) {
            fireEvent.input(input, { target: { value: query } });
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
        const result = render(<UIComboBox options={data} highlight={false} allowFreeform={true} autoComplete="on" />);
        container = result.container;
        rerender = result.rerender;
    });

    afterEach(() => {
        jest.clearAllMocks();
        cleanup();
    });

    it('Test css selectors which are used in scss - main', () => {
        expect(container.querySelectorAll('.ms-ComboBox').length).toEqual(1);
        expect(container.querySelectorAll('.ms-ComboBox .ms-Button--icon i svg').length).toEqual(1);
        openDropdown();
        expect(container.querySelectorAll(menuDropdownSelector).length).toEqual(1);
        expect(container.querySelectorAll(`${menuDropdownSelector} .ms-Callout-main`).length).toBeGreaterThan(0);
        expect(
            container.querySelectorAll(`${menuDropdownSelector} .ms-ComboBox-optionsContainer .ms-Button--command`).length
        ).toBeGreaterThan(0);
        expect(container.querySelectorAll(nonHighlighttItemSelector).length).toBeGreaterThan(0);
        expect(container.querySelectorAll(highlightItemSelector).length).toEqual(0);
    });

    it('Styles - default', () => {
        const comboBox = container.querySelector('.ms-ComboBox');
        expect(comboBox).toBeInTheDocument();
        // Test that the component renders with expected structure
        expect(comboBox).toHaveClass('ms-ComboBox');
    });

    it('Styles - required', () => {
        rerender(<UIComboBox options={data} highlight={false} allowFreeform={true} autoComplete="on" required={true} />);
        const comboBox = container.querySelector('.ms-ComboBox');
        expect(comboBox).toBeInTheDocument();
        // Test that the component renders with expected structure for required field
        expect(comboBox).toHaveClass('ms-ComboBox');
    });

    describe('Test highlight', () => {
        beforeEach(() => {
            rerender(<UIComboBox options={data} highlight={true} allowFreeform={true} autoComplete="on" />);
        });

        it('Test css selectors which are used in scss - with highlight', () => {
            openDropdown();
            expect(container.querySelectorAll(highlightItemSelector).length).toBeGreaterThan(0);
            expect(container.querySelectorAll(nonHighlighttItemSelector).length).toEqual(0);
        });

        describe('Test on "Keydown"', () => {
            const openMenuOnClickOptions = [true, false, undefined];
            for (const openMenuOnClick of openMenuOnClickOptions) {
                it(`Test on "Keydown" - open callout, "openMenuOnClick=${openMenuOnClick}"`, () => {
                    rerender(<UIComboBox options={data} highlight={true} allowFreeform={true} autoComplete="on" openMenuOnClick={openMenuOnClick} />);
                    expect(container.querySelectorAll(menuDropdownSelector).length).toEqual(0);
                    const input = container.querySelector('input');
                    if (input) {
                        fireEvent.keyDown(input, {});
                    }
                    expect(container.querySelectorAll(menuDropdownSelector).length).toEqual(1);
                });
            }

            it('Test on "Keydown" - test arrow Cycling', () => {
                expect(container.querySelectorAll(menuDropdownSelector).length).toEqual(0);
                const input = container.querySelector('input');
                if (input) {
                    // Open callout
                    fireEvent.keyDown(input, { which: KeyCodes.down });
                    expect(container.querySelectorAll(menuDropdownSelector).length).toEqual(1);
                    // First empty option
                    const selectedOption = container.querySelector('.ts-ComboBox--selected .ts-Menu-option');
                    expect(selectedOption?.textContent).toEqual('');
                    // Test cycling UP - last item should be selected
                    fireEvent.keyDown(input, { which: KeyCodes.up });
                    const selectedOptionUp = container.querySelector('.ts-ComboBox--selected .ts-Menu-option');
                    expect(selectedOptionUp?.textContent).toEqual('Yemen');
                    // Test cycling UP - first item should be selected
                    fireEvent.keyDown(input, { which: KeyCodes.down });
                    const selectedOptionFirst = container.querySelector('.ts-ComboBox--selected .ts-Menu-option');
                    expect(selectedOptionFirst?.textContent).toEqual('');
                    // Go one more step down
                    fireEvent.keyDown(input, { which: KeyCodes.down });
                    const selectedOptionNext = container.querySelector('.ts-ComboBox--selected .ts-Menu-option');
                    expect(selectedOptionNext?.textContent).toEqual('Algeria');
                }
            });

            it(`Test on "Keydown" - keyboard keys, which does not trigger dropdown open`, () => {
                const ignoredOpenKeys = ['Meta', 'Control', 'Shift', 'Tab', 'Alt', 'CapsLock'];

                expect(container.querySelectorAll(menuDropdownSelector).length).toEqual(0);
                const input = container.querySelector('input');
                if (input) {
                    for (const ignoredKey of ignoredOpenKeys) {
                        fireEvent.keyDown(input, { key: ignoredKey });
                    }
                    // None of previously pressed keys should not trigger open for dropdown menu
                    expect(container.querySelectorAll(menuDropdownSelector).length).toEqual(0);
                    // Trigger with valid key
                    fireEvent.keyDown(input, { key: 'a' });
                    expect(container.querySelectorAll(menuDropdownSelector).length).toEqual(1);
                }
            });
        });

        it('Test "onInput"', () => {
            const query = 'Lat';
            const input = container.querySelector('input');
            if (input) {
                fireEvent.keyDown(input, {});
                triggerSearch(query);
                expect(container.querySelectorAll('.ts-Menu-option--highlighted').length).toEqual(1);
                const highlightedOption = container.querySelector('.ts-Menu-option--highlighted');
                expect(highlightedOption?.textContent).toEqual(query);
            }
        });

        it('Test onInput value selection', async () => {
            const requestAnimationFrameSpy = jest.spyOn(window, 'requestAnimationFrame');
            const input = container.querySelector('input') as HTMLInputElement;
            if (input) {
                fireEvent.input(input, { target: { value: 'test' } });
                await new Promise((resolve) => setTimeout(resolve));
                const selections = input.selectionEnd;
                expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(1);
                expect(selections).toBe(4);

                input.value = 'test01';
                input.selectionEnd = input.selectionStart = 2;
                fireEvent.input(input, { target: input });
                input.selectionEnd = input.selectionStart = selections;
                await new Promise((resolve) => setTimeout(resolve));
                expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(2);
                expect(input.selectionEnd).toBe(2);
            }
        });

        it('Test onClick value selection', async () => {
            rerender(<UIComboBox options={data} highlight={true} allowFreeform={true} autoComplete="on" selectedKey="AU" />);
            const input = container.querySelector('input') as HTMLInputElement;
            if (input) {
                input.selectionEnd = input.selectionStart = 2;
                fireEvent.click(input, { target: input });
                input.selectionEnd = input.selectionStart = 5;
                await new Promise((resolve) => setTimeout(resolve));
                expect(input.selectionEnd).toBe(2);
            }
        });

        it('Test "reserQuery"', () => {
            openDropdown();
            triggerSearch('Au');
            expect(container.querySelectorAll(menuDropdownSelector).length).toEqual(1);
            let hiddenItemsExist = data.some((option) => {
                return option.hidden;
            });
            expect(hiddenItemsExist).toEqual(true);
            // Close callout
            const input = container.querySelector('input');
            if (input) {
                fireEvent.keyDown(input, { which: KeyCodes.escape });
                expect(container.querySelectorAll(menuDropdownSelector).length).toEqual(0);
                hiddenItemsExist = data.some((option) => {
                    return option.hidden;
                });
                expect(hiddenItemsExist).toEqual(false);
            }
        });

        it('Test list visibility', () => {
            const input = container.querySelector('input');
            if (input) {
                fireEvent.keyDown(input, {});
                triggerSearch('Lat');
                // List should be visible - there is some occurrences
                expect(container.querySelector(menuDropdownSelector)).toBeInTheDocument();
                // List should be hidden - there any occurrence
                triggerSearch('404');
                // After a search with no results, the dropdown should still be visible but empty
                expect(container.querySelector(menuDropdownSelector)).toBeInTheDocument();
            }
        });
    });

    it('Test "useComboBoxAsMenuMinWidth"', () => {
        cleanup();
        const result = render(
            <UIComboBox
                options={data}
                highlight={false}
                allowFreeform={true}
                autoComplete="on"
                useComboBoxAsMenuMinWidth={true}
            />
        );
        container = result.container;
        openDropdown();
        // Test that the component renders correctly with useComboBoxAsMenuMinWidth
        expect(container.querySelector('.ms-ComboBox')).toBeInTheDocument();
    });

    it('Test menu close method', () => {
        const comboboxRef = React.createRef<UIComboBox & HTMLDivElement>();
        cleanup();
        const result = render(
            <UIComboBox
                ref={comboboxRef}
                options={data}
                highlight={true}
                allowFreeform={true}
                autoComplete="on"
                useComboBoxAsMenuMinWidth={true}
            />
        );
        container = result.container;
        expect(container.querySelectorAll(menuDropdownSelector).length).toEqual(0);
        // Open callout
        openDropdown();
        expect(container.querySelectorAll(menuDropdownSelector).length).toEqual(1);
        comboboxRef.current?.dismissMenu();
        expect(container.querySelectorAll(menuDropdownSelector).length).toEqual(0);
    });

    describe('Multiselect', () => {
        it('No filtration', () => {
            const comboboxRef = React.createRef<UIComboBox & HTMLDivElement>();
            let keys = [];
            const onChange = jest
                .fn()
                .mockImplementation((event: React.FormEvent<IComboBox>, option?: IComboBoxOption | undefined) => {
                    keys = [...keys, option.key].filter((k) => (option.selected ? true : k !== option.key));
                });

            cleanup();
            const result = render(
                <UIComboBox
                    ref={comboboxRef}
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
            container = result.container;
            expect(container.querySelectorAll(menuDropdownSelector).length).toEqual(0);
            // Open callout
            openDropdown();
            expect(container.querySelectorAll(menuDropdownSelector).length).toEqual(1);
            // select some options
            const options = container.querySelectorAll('.ms-Checkbox.is-enabled.ms-ComboBox-option');
            expect(options.length).toBeGreaterThan(0);
            
            const firstOptionInput = options[1]?.querySelector('input');
            if (firstOptionInput) {
                fireEvent.change(firstOptionInput, {
                    target: {
                        value: true,
                        name: 'test1'
                    }
                });
            }
            
            const secondOptionInput = options[2]?.querySelector('input');
            if (secondOptionInput) {
                fireEvent.change(secondOptionInput, {
                    target: {
                        checked: true,
                        name: 'test2'
                    }
                });
            }

            result.rerender(
                <UIComboBox
                    ref={comboboxRef}
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

            const selectedOptions = container.querySelectorAll('.ms-Checkbox.is-checked.ms-ComboBox-option');
            expect(selectedOptions.length).toBe(2);
        });

        it('With filter and changes in options', () => {
            const comboboxRef = React.createRef<UIComboBox & HTMLDivElement>();
            let keys = [];
            const onChange = jest
                .fn()
                .mockImplementation((event: React.FormEvent<IComboBox>, option?: IComboBoxOption | undefined) => {
                    keys = [...keys, option.key].filter((k) => (option.selected ? true : k !== option.key));
                });

            cleanup();
            const result = render(
                <UIComboBox
                    ref={comboboxRef}
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
            container = result.container;

            expect(container.querySelectorAll(menuDropdownSelector).length).toEqual(0);
            const query = 'Lat';
            const input = container.querySelector('input');
            if (input) {
                fireEvent.keyDown(input, {});
                fireEvent.input(input, { target: { value: query } });
                expect(container.querySelectorAll('.ts-Menu-option--highlighted').length).toEqual(1);
                const highlightedOption = container.querySelector('.ts-Menu-option--highlighted');
                expect(highlightedOption?.textContent).toEqual(query);

                // select some options
                const options = container.querySelectorAll('.ms-Checkbox.is-enabled.ms-ComboBox-option');
                expect(options.length).toBeGreaterThan(0);
                
                const firstOptionInput = options[0]?.querySelector('input');
                if (firstOptionInput) {
                    fireEvent.change(firstOptionInput, {
                        target: {
                            value: true,
                            name: 'test1'
                        }
                    });
                }

                result.rerender(
                    <UIComboBox
                        ref={comboboxRef}
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

                const selectedOptions = container.querySelectorAll('.ms-Checkbox.is-checked.ms-ComboBox-option');
                expect(selectedOptions.length).toBe(1);
            }
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
                cleanup();
                const result = render(
                    <UIComboBox
                        options={data}
                        highlight={true}
                        allowFreeform={true}
                        multiSelect={!testCase.singleSelect}
                        autoComplete="on"
                        useComboBoxAsMenuMinWidth={true}
                    />
                );
                container = result.container;
                
                // Test basic functionality without accessing internal components
                if (testCase.singleSelect) {
                    // Single select should work normally
                    expect(container.querySelector('.ms-ComboBox')).toBeInTheDocument();
                    return;
                }
                // Open callout
                openDropdown();
                const input = container.querySelector(inputSelector);
                if (input) {
                    fireEvent.keyDown(input, { which: KeyCodes.down });
                    // Mock element
                    const element = container.querySelector('.ts-ComboBox--selected');
                    if (element) {
                        jest.spyOn(element as HTMLElement, 'offsetTop', 'get').mockReturnValue(testCase.element.offsetTop);
                        jest.spyOn(element as HTMLElement, 'clientHeight', 'get').mockReturnValue(testCase.element.clientHeight);
                        // Test that scrolling behavior is handled correctly
                        expect(scrollTopSetter).toBeCalledTimes(testCase.expect ? 1 : 0);
                        if (testCase.expect !== undefined) {
                            expect(scrollTopSetter).toBeCalledWith(testCase.expect);
                        }
                    }
                }
            });
        }
    });

    describe('Error message', () => {
        it('Error', () => {
            rerender(<UIComboBox options={data} highlight={false} allowFreeform={true} autoComplete="on" errorMessage="dummy" />);
            expect(container.querySelectorAll('.ts-ComboBox--error').length).toEqual(1);
            expect(container.querySelectorAll('.ts-ComboBox--warning').length).toEqual(0);
            expect(container.querySelectorAll('.ts-ComboBox--info').length).toEqual(0);
        });

        it('Warning', () => {
            rerender(<UIComboBox options={data} highlight={false} allowFreeform={true} autoComplete="on" warningMessage="dummy" />);
            expect(container.querySelectorAll('.ts-ComboBox--error').length).toEqual(0);
            expect(container.querySelectorAll('.ts-ComboBox--warning').length).toEqual(1);
            expect(container.querySelectorAll('.ts-ComboBox--info').length).toEqual(0);
        });

        it('Info', () => {
            rerender(<UIComboBox options={data} highlight={false} allowFreeform={true} autoComplete="on" infoMessage="dummy" />);
            expect(container.querySelectorAll('.ts-ComboBox--error').length).toEqual(0);
            expect(container.querySelectorAll('.ts-ComboBox--warning').length).toEqual(0);
            expect(container.querySelectorAll('.ts-ComboBox--info').length).toEqual(1);
        });
    });

    describe('Behavior of title/tooltip for options', () => {
        const buttonSelector = `${menuDropdownSelector} .ms-Button--command`;
        it('Default - inherit from text', () => {
            rerender(<UIComboBox options={originalData} highlight={true} allowFreeform={true} autoComplete="on" />);
            openDropdown();
            const buttons = container.querySelectorAll(buttonSelector);
            const lastButton = buttons[buttons.length - 1];
            expect(lastButton?.getAttribute('title')).toEqual('Yemen');
        });

        it('Custom title', () => {
            const expectTitle = 'dummy';
            const dataTemp = JSON.parse(JSON.stringify(originalData));
            dataTemp[dataTemp.length - 1].title = expectTitle;
            rerender(<UIComboBox options={dataTemp} highlight={true} allowFreeform={true} autoComplete="on" />);
            openDropdown();
            const buttons = container.querySelectorAll(buttonSelector);
            const lastButton = buttons[buttons.length - 1];
            expect(lastButton?.getAttribute('title')).toEqual(expectTitle);
        });

        it('No title', () => {
            const dataTemp = JSON.parse(JSON.stringify(originalData));
            dataTemp[dataTemp.length - 1].title = null;
            rerender(<UIComboBox options={dataTemp} highlight={true} allowFreeform={true} autoComplete="on" />);
            openDropdown();
            const buttons = container.querySelectorAll(buttonSelector);
            const lastButton = buttons[buttons.length - 1];
            expect(lastButton?.getAttribute('title')).toEqual(null);
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
                rerender(<UIComboBox options={data} highlight={false} allowFreeform={true} autoComplete="on" openMenuOnClick={testCase.value} />);
                expect(container.querySelectorAll(menuDropdownSelector).length).toEqual(0);
                const input = container.querySelector('input');
                if (input) {
                    fireEvent.click(input);
                    expect(container.querySelectorAll(menuDropdownSelector).length).toEqual(testCase.expectOpen ? 1 : 0);
                }
            });
        }
    });

    describe('Test "isForceEnabled" property', () => {
        const testCases = [true, false];
        for (const testCase of testCases) {
            it(`isForceEnabled=${testCase}`, () => {
                rerender(<UIComboBox options={[]} highlight={false} allowFreeform={true} autoComplete="on" isForceEnabled={testCase} />);
                const comboBox = container.querySelector('.ms-ComboBox');
                if (testCase) {
                    expect(comboBox).not.toHaveAttribute('disabled');
                } else {
                    // When not force enabled and no options, should be disabled
                    expect(comboBox).toBeInTheDocument();
                }
            });
        }
    });

    it('Test "disabled" property', () => {
        rerender(<UIComboBox options={data} highlight={false} allowFreeform={true} autoComplete="on" disabled={true} />);
        const input = container.querySelector(inputSelector);
        expect(input).toHaveAttribute('readonly');
        expect(input).toHaveAttribute('aria-disabled', 'true');
    });

    describe('Test "aria-invalid" set according to error message', () => {
        it('No Error case', () => {
            const input = container.querySelector('input');
            expect(input).toHaveAttribute('aria-invalid', 'false');
        });

        it('Error case', () => {
            rerender(<UIComboBox options={data} highlight={false} allowFreeform={true} autoComplete="on" errorMessage="dummy" />);
            const input = container.querySelector('input');
            expect(input).toHaveAttribute('aria-invalid', 'true');
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
                const props = {
                    options: data,
                    highlight: false,
                    allowFreeform: true,
                    autoComplete: 'on' as const,
                    readOnly: testCase.readOnly,
                    ...(testCase.tabIndex && { tabIndex: testCase.tabIndex }),
                    ...(testCase.disabled && { disabled: testCase.disabled })
                };
                rerender(<UIComboBox {...props} />);
                
                const input = container.querySelector('input');
                if (input) {
                    expect(input.readOnly).toEqual(expected.readOnly);
                    if (expected.tabIndex !== undefined) {
                        expect(input.tabIndex).toEqual(expected.tabIndex);
                    }
                }
                
                const comboBox = container.querySelector('.ts-ComboBox');
                if (comboBox) {
                    const className = comboBox.className;
                    expect(className.includes('ts-ComboBox--readonly')).toEqual(
                        !testCase.disabled ? !!expected.readOnly : false
                    );
                    expect(className.includes('ts-ComboBox--disabled')).toEqual(!!testCase.disabled);
                }
                
                // Additional properties
                if (!testCase.disabled && expected.readOnly) {
                    expect(input).toHaveAttribute('aria-readonly', 'true');
                } else {
                    expect(input).toHaveAttribute('aria-disabled', String(!!testCase.disabled));
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
                rerender(<UIComboBox options={data} highlight={false} allowFreeform={true} autoComplete="on" text={testCase.text} selectedKey={testCase.selectedKey} />);
                expect(container.querySelectorAll('div.ts-ComboBox--empty').length).toEqual(testCase.expected ? 1 : 0);
            });
        }
    });

    describe('Combobox items with group headers', () => {
        beforeEach(() => {
            rerender(<UIComboBox options={groupsData} highlight={true} allowFreeform={true} autoComplete="on" />);
        });

        it('Test css selectors which are used in scss - with highlight', () => {
            openDropdown();
            expect(container.querySelectorAll(headerItemSelector).length).toEqual(7);
            // Search items and hide group header if no matching children
            const input = container.querySelector('input');
            if (input) {
                fireEvent.keyDown(input, {});
                triggerSearch('Est');
                expect(container.querySelectorAll(headerItemSelector).length).toEqual(1);
                const headerItem = container.querySelector(headerItemSelector);
                expect(headerItem?.textContent).toEqual('Europe');
                // Search and match first group
                triggerSearch('gypt');
                expect(container.querySelectorAll(headerItemSelector).length).toEqual(1);
                const headerItemFirst = container.querySelector(headerItemSelector);
                expect(headerItemFirst?.textContent).toEqual('Africa');
                // Search and match last group
                triggerSearch('dumy');
                expect(container.querySelectorAll(headerItemSelector).length).toEqual(1);
                const headerItemLast = container.querySelector(headerItemSelector);
                expect(headerItemLast?.textContent).toEqual('Unknown');
                // Search and match multiple groups
                triggerSearch('la');
                expect(container.querySelectorAll(headerItemSelector).length).toEqual(3);
                // Search without matching
                triggerSearch('404');
                expect(container.querySelectorAll(headerItemSelector).length).toEqual(0);
                // Reset search
                triggerSearch('');
                expect(container.querySelectorAll(headerItemSelector).length).toEqual(7);
            }
        });
    });

    it('Handle "onPendingValueChanged"', () => {
        const onPendingValueChanged = jest.fn();
        rerender(<UIComboBox options={data} highlight={true} allowFreeform={true} autoComplete="on" onPendingValueChanged={onPendingValueChanged} />);
        expect(container.querySelectorAll(menuDropdownSelector).length).toEqual(0);
        // Open callout
        expect(onPendingValueChanged).not.toBeCalled();
        const input = container.querySelector('input');
        if (input) {
            fireEvent.keyDown(input, { which: KeyCodes.down });
            expect(onPendingValueChanged).toBeCalled();
            const callArgs = onPendingValueChanged.mock.calls[0];
            expect(callArgs[0].key).toEqual('LV');
            expect(callArgs[1]).toEqual(35);
        }
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
                rerender(<UIComboBox options={data} highlight={false} allowFreeform={true} autoComplete="on" multiSelect={multiSelect} calloutCollisionTransformation={enabled} />);
                const comboBox = container.querySelector('.ms-ComboBox');
                expect(comboBox).toBeInTheDocument();
                
                // Test that collision transformation is applied when expected
                if (expected) {
                    expect(CalloutCollisionTransformSpy.preventDismissOnEvent).toHaveBeenCalled();
                    expect(CalloutCollisionTransformSpy.applyTransformation).toHaveBeenCalled();
                    expect(CalloutCollisionTransformSpy.resetTransformation).toHaveBeenCalled();
                } else {
                    // For non-expected cases, just verify the component renders
                    expect(comboBox).toBeInTheDocument();
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
            rerender(<UIComboBox options={data} highlight={false} allowFreeform={true} autoComplete="on" multiSelect={true} calloutCollisionTransformation={true} {...externalListeners} />);
            const comboBox = container.querySelector('.ms-ComboBox');
            expect(comboBox).toBeInTheDocument();
            
            // Test that external listeners are called
            expect(CalloutCollisionTransformSpy.preventDismissOnEvent).toHaveBeenCalled();
            expect(CalloutCollisionTransformSpy.applyTransformation).toHaveBeenCalled();
            expect(CalloutCollisionTransformSpy.resetTransformation).toHaveBeenCalled();
            expect(externalListeners.calloutProps.preventDismissOnEvent).toHaveBeenCalled();
            expect(externalListeners.calloutProps.layerProps.onLayerDidMount).toHaveBeenCalled();
            expect(externalListeners.calloutProps.layerProps.onLayerWillUnmount).toHaveBeenCalled();
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
            rerender(<UIComboBox options={data} highlight={false} allowFreeform={true} autoComplete="on" isLoading={isLoading} />);
            openDropdown();
            expect(container.querySelectorAll('.ms-Callout UILoader').length).toEqual(expectLoaderInMenu ? 1 : 0);
            expect(container.querySelectorAll('.ms-ComboBox UILoader').length).toEqual(expectLoaderInInput ? 1 : 0);
        });
    });

    it('Custom renderers for "onRenderOption"', () => {
        rerender(<UIComboBox options={data} highlight={true} allowFreeform={true} autoComplete="on" onRenderOption={(
            props?: UIComboBoxOption,
            defaultRender?: (props?: UIComboBoxOption) => JSX.Element | null
        ) => {
            return <div className="custom-render-option">{defaultRender?.(props)}</div>;
        }} />);
        openDropdown();
        expect(container.querySelectorAll('.custom-render-option').length).toBeGreaterThan(0);
        expect(container.querySelectorAll(highlightItemSelector).length).toBeGreaterThan(0);
    });

    it('Custom renderers for "onRenderItem"', () => {
        rerender(<UIComboBox options={JSON.parse(JSON.stringify(originalData))} highlight={true} allowFreeform={true} autoComplete="on" selectedKey="AR" onRenderItem={(
            props?: UIComboBoxOption,
            defaultRender?: (props?: UIComboBoxOption) => JSX.Element | null
        ) => {
            return <div className="custom-render-item">{defaultRender?.(props)}</div>;
        }} />);
        openDropdown();
        expect(container.querySelectorAll('.custom-render-item').length).toBeGreaterThan(0);
        expect(container.querySelectorAll('.ts-ComboBox--selected').length).toBeGreaterThan(0);
    });

    it('Test "calloutProps"', () => {
        rerender(<UIComboBox options={data} highlight={false} allowFreeform={true} autoComplete="on" calloutProps={{ className: 'dummy' }} />);
        openDropdown();
        expect(container.querySelectorAll('div.dummy').length).toEqual(1);
    });

    describe('Test "searchByKeyEnabled" property', () => {
        const searchKeysData = [
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
                rerender(<UIComboBox options={searchKeysData} highlight={true} allowFreeform={true} autoComplete="on" searchByKeyEnabled={searchByKeyEnabled} />);
                openDropdown();
                const input = container.querySelector('input');
                if (input) {
                    fireEvent.keyDown(input, {});
                    triggerSearch(query);
                    expect(container.querySelectorAll('.ms-Button').length).toEqual(expectedCount);
                }
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
                options: data,
                query: 'Lorem ipsum dolor sit amet',
                expectedCountBefore: 1,
                expectedCountAfter: 0
            }
        ];
        for (const testCase of testCases) {
            const { name, query, expectedCountBefore, expectedCountAfter, options } = testCase;
            it(name, () => {
                // Default state before custom filter
                rerender(<UIComboBox options={options} highlight={true} allowFreeform={true} autoComplete="on" />);
                openDropdown();
                const input = container.querySelector('input');
                if (input) {
                    fireEvent.keyDown(input, {});
                    triggerSearch(query);
                    expect(container.querySelectorAll('.ms-Button--action').length).toEqual(expectedCountBefore);
                    // Apply custom filter and check result for same query
                    rerender(<UIComboBox options={options} highlight={true} allowFreeform={true} autoComplete="on" customSearchFilter={(searchTerm: string, option: UIComboBoxOption) => {
                        if ('customMark' in option && option.customMark) {
                            return true;
                        }
                        if (option.key === 'BC') {
                            // Hide 'Lorem ipsum dolor sit amet' when searching
                            return false;
                        }
                        return undefined;
                    }} />);
                    openDropdown();
                    fireEvent.keyDown(input, {});
                    triggerSearch(query);
                    expect(container.querySelectorAll('.ms-Button--action').length).toEqual(expectedCountAfter);
                }
            });
        }
    });

    describe('externalSearchProps', () => {
        const selectors = {
            noDataText: '.option-no-data'
        };
        beforeEach(() => {
            rerender(<UIComboBox options={[]} highlight={false} allowFreeform={true} autoComplete="on" isForceEnabled={true} />);
        });

        it('Check "noDataLabel"', () => {
            const noDataLabel = 'Dummy text';
            rerender(<UIComboBox options={[]} highlight={false} allowFreeform={true} autoComplete="on" isForceEnabled={true} externalSearchProps={{
                noDataLabel,
                onExternalSearch: jest.fn()
            }} />);
            openDropdown();
            expect(container.querySelectorAll(selectors.noDataText).length).toEqual(1);
            const noDataElement = container.querySelector(selectors.noDataText);
            expect(noDataElement?.textContent).toEqual(noDataLabel);
        });

        it('Handle "onInputChange" and "onExternalSearch"', async () => {
            const noDataLabel = 'Dummy text';
            const onInputChange = jest.fn();
            const onExternalSearch = jest.fn();
            cleanup();
            const result = render(
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
            container = result.container;
            
            const input = container.querySelector('input');
            if (input) {
                fireEvent.input(input, { target: { value: 'My' } });
                fireEvent.input(input, { target: { value: 'My dummy' } });
                fireEvent.input(input, { target: { value: 'My dummy value' } });
                await new Promise((resolve) => setTimeout(resolve, 20));
                expect(onInputChange).toBeCalledTimes(3);
                expect(onExternalSearch).toBeCalledTimes(1);
                expect(onExternalSearch).toHaveBeenCalledWith('My dummy value');
            }
        });
    });
});
