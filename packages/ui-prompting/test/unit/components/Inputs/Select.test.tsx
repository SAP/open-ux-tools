import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { initIcons } from '@sap-ux/ui-components';
import type { SelectProps } from '../../../../src/components';
import { Select } from '../../../../src/components';

const props: SelectProps = {
    name: 'select',
    value: '',
    onChange: jest.fn(),
    guiOptions: {
        mandatory: undefined,
        hint: '',
        placeholder: undefined
    },
    errorMessage: undefined,

    choices: [
        { name: 'testText0', value: 'testValue0' },
        { name: 'testText1', value: 'testValue1' }
    ],
    pending: false,
    type: 'list'
};

const creatableProps: SelectProps = {
    ...props,
    guiOptions: { ...props.guiOptions, creation: { placeholder: 'test input placeholder' } }
};

describe('Select', () => {
    initIcons();

    const simulateComboboxValueInput = (input: HTMLElement, value: string): void => {
        fireEvent.focus(input);
        fireEvent.input(input, { target: { value: value } });
        fireEvent.blur(input);
    };

    it('Render select', () => {
        render(<Select {...props} />);
        expect(document.getElementsByClassName('.ts-ComboBox')).toBeDefined();
    });

    it('Test property "id"', async () => {
        render(<Select {...props} id="test-id" />);
        expect(document.getElementById('test-id')).not.toBeNull();
    });

    it('Render select with value', () => {
        render(<Select {...props} value="testValue1" />);
        expect(screen.getByDisplayValue('testText1')).toBeDefined();
    });

    it('Test internal choices', () => {
        render(<Select {...props} />);
        const input = screen.getByRole('combobox');
        expect(input).toBeDefined();
        const button = document.getElementsByClassName('ms-Button')[0];
        fireEvent.click(button);
        expect(screen.queryAllByRole('option')).toHaveLength(2);
        expect(screen.queryAllByRole('option').map((option) => option.textContent)).toEqual(['testText0', 'testText1']);
    });

    it('Test dynamic choices', () => {
        render(
            <Select
                {...props}
                dynamicChoices={[
                    { name: 'dynamicTest0', value: 'dynamicValue0' },
                    { name: 'dynamicTest1', value: 'dynamicValue1' }
                ]}
            />
        );
        const input = screen.getByRole('combobox');
        expect(input).toBeDefined();
        const button = document.getElementsByClassName('ms-Button')[0];
        fireEvent.click(button);
        expect(screen.queryAllByRole('option')).toHaveLength(2);
        expect(screen.queryAllByRole('option').map((option) => option.textContent)).toEqual([
            'dynamicTest0',
            'dynamicTest1'
        ]);
    });

    it('Test property onChange', () => {
        const onChangeFn = jest.fn();
        render(<Select {...props} onChange={onChangeFn} />);
        const input = screen.getByRole('combobox');
        expect(input).toBeDefined();
        const button = document.getElementsByClassName('ms-Button')[0];
        fireEvent.click(button);
        const options = screen.queryAllByRole('option');
        expect(options[0]).toBeDefined();
        fireEvent.click(options[0]);
        expect(onChangeFn).toHaveBeenCalled();
        expect(onChangeFn).toHaveBeenCalledWith('select', 'testValue0');
        expect(screen.getByDisplayValue('testText0')).toBeDefined();
    });

    it('Test property onChange - boolean', () => {
        const onChangeFn = jest.fn();
        render(
            <Select
                {...props}
                onChange={onChangeFn}
                choices={[
                    { name: 'False', value: false },
                    { name: 'True', value: true }
                ]}
            />
        );
        const input = screen.getByRole('combobox');
        expect(input).toBeDefined();
        const button = document.getElementsByClassName('ms-Button')[0];
        fireEvent.click(button);
        const options = screen.queryAllByRole('option');
        expect(options[0]).toBeDefined();
        fireEvent.click(options[0]);
        expect(onChangeFn).toHaveBeenCalled();
        expect(onChangeFn).toHaveBeenCalledWith('select', false);
        expect(screen.getByDisplayValue('False')).toBeDefined();
    });

    it('Test property onChange - input non-existent value does not reset selected option', () => {
        const onChangeFn = jest.fn();
        render(<Select {...props} onChange={onChangeFn} value="testValue1" />);
        const input = screen.getByRole('combobox');
        expect(input).toBeDefined();
        expect(screen.getByDisplayValue('testText1')).toBeDefined();
        simulateComboboxValueInput(input, 'new value');
        expect(onChangeFn).not.toHaveBeenCalled();
        expect(screen.getByDisplayValue('testText1')).toBeDefined();
    });

    it('Test property onChange - delete the selected value', async () => {
        const onChangeFn = jest.fn();
        render(<Select {...props} onChange={onChangeFn} value="testValue1" />);
        const input = screen.getByRole('combobox');
        expect(input).toBeDefined();
        expect(screen.getByDisplayValue('testText1')).toBeDefined();
        simulateComboboxValueInput(input, '');
        expect(onChangeFn).toHaveBeenCalled();
        expect(screen.queryAllByDisplayValue('testText1')).toHaveLength(0);
    });

    it('Test property required', () => {
        render(
            <Select
                {...props}
                guiOptions={{
                    mandatory: true
                }}
            />
        );
        expect(document.getElementsByClassName('.is-required')).toBeDefined();
    });

    it('Test property description', () => {
        render(
            <Select
                {...props}
                guiOptions={{
                    hint: 'testInfo'
                }}
            />
        );
        expect(screen.getByTitle('testInfo')).toBeDefined();
    });

    it('Test property errorMessage', () => {
        render(<Select {...props} errorMessage="testErrorMessage" />);
        expect(screen.getByRole('alert')).toBeDefined();
    });

    it('Test property placeholder', () => {
        render(
            <Select
                {...props}
                guiOptions={{
                    placeholder: 'testPlaceholder'
                }}
            />
        );
        expect(screen.getByPlaceholderText('testPlaceholder')).toBeDefined();
    });

    it('Test property pending', () => {
        render(<Select {...props} pending={true} />);
        expect(document.getElementsByClassName('ms-Spinner-circle')).toBeDefined();
    });

    it('Test value reset', () => {
        const choices = [
            { name: 'False', value: false },
            { name: 'True', value: true }
        ];
        const { rerender } = render(<Select {...props} value={true} choices={choices} />);
        let input = screen.getByRole('combobox');
        expect(input).toBeDefined();
        expect(input.getAttribute('value')).toEqual('True');
        rerender(<Select {...props} value={undefined} choices={choices} />);
        input = screen.getByRole('combobox');
        expect(input.getAttribute('value')).toEqual('');
    });

    describe('Select with creation enabled: ', () => {
        describe('With options', () => {
            it('Render creatable select', () => {
                render(<Select {...creatableProps} />);
                expect(document.getElementsByClassName('.ts-ComboBox')).toBeDefined();
            });

            it('Render creatable select with value', () => {
                render(<Select {...creatableProps} value="testValue1" />);
                expect(screen.getByDisplayValue('testValue1')).toBeDefined();
            });

            it('Test creatable select property onChange - select an option', () => {
                const onChangeFn = jest.fn();
                render(
                    <Select
                        {...creatableProps}
                        choices={[
                            { name: 'testText0', value: 'testValue0' },
                            { name: 'testText1', value: 'testValue1' }
                        ]}
                        onChange={onChangeFn}
                    />
                );
                const input = screen.getByRole('combobox');
                expect(input).toBeDefined();
                const button = document.getElementsByClassName('ms-Button')[0];
                fireEvent.click(button);
                const options = screen.getAllByRole('option');
                expect(options[0]).toBeDefined();
                fireEvent.click(options[0]);
                expect(onChangeFn).toHaveBeenCalled();
                expect(onChangeFn).toHaveBeenCalledWith('select', 'testValue0');
                expect(screen.getByDisplayValue('testValue0')).toBeDefined();
            });

            it('Test creatable select property onChange - options available but enter a new value', () => {
                const value = 'new value';
                const onChangeFn = jest.fn();
                render(<Select {...creatableProps} onChange={onChangeFn} />);
                const input = screen.getByRole('combobox');
                expect(input).toBeDefined();
                simulateComboboxValueInput(input, value);
                expect(screen.getByDisplayValue(value)).toBeDefined();
                expect(onChangeFn).toHaveBeenCalled();
                expect(onChangeFn).toHaveBeenCalledWith('select', value);
            });

            it('Test creatable select property onChange - delete the selected value', async () => {
                const onChangeFn = jest.fn();
                render(<Select {...creatableProps} onChange={onChangeFn} value="testValue1" />);
                const input = screen.getByRole('combobox');
                expect(input).toBeDefined();
                simulateComboboxValueInput(input, '');
                expect(screen.queryAllByDisplayValue('testValue1')).toHaveLength(0);
                expect(onChangeFn).toHaveBeenCalled();
                expect(onChangeFn).toHaveBeenCalledWith('select', '');
            });

            it('renders and associates label from default name prop when no message is provided', async () => {
                const onChangeFn = jest.fn();
                render(<Select {...creatableProps} onChange={onChangeFn} />);
                const input = screen.getByRole('combobox');
                expect(input).toBeDefined();

                // Wait for the label to resolve to "select"
                const labeledElements = await screen.findAllByLabelText('select');
                expect(labeledElements.length).toBeGreaterThan(0);
                const inputElement = labeledElements.find((el) => el.tagName === 'INPUT');
                expect(inputElement).toBeDefined();
            });

            it('renders and associates label from message string prop', async () => {
                const onChangeFn = jest.fn();
                const msg = 'String Test Message';
                render(<Select {...creatableProps} onChange={onChangeFn} message={msg} />);
                const input = screen.getByRole('combobox');
                expect(input).toBeDefined();

                // Wait for the label to resolve to "String Test Message"
                const labeledElements = await screen.findAllByLabelText('String Test Message');
                expect(labeledElements.length).toBeGreaterThan(0);
                const inputElement = labeledElements.find((el) => el.tagName === 'INPUT');
                expect(inputElement).toBeDefined();
            });

            it('renders and associates label from async message function', async () => {
                const onChangeFn = jest.fn();
                const msg = () => 'Dynamic Test Message';
                render(<Select {...creatableProps} onChange={onChangeFn} message={msg} />);
                const input = screen.getByRole('combobox');
                expect(input).toBeDefined();

                // Wait for the label to resolve to "Dynamic Test Message"
                const labeledElements = await screen.findAllByLabelText('Dynamic Test Message');
                expect(labeledElements.length).toBeGreaterThan(0);
                const inputElement = labeledElements.find((el) => el.tagName === 'INPUT');
                expect(inputElement).toBeDefined();
            });
        });

        describe('No options', () => {
            const creatablePropsNoOptions = { ...creatableProps, choices: [] };

            it('Render creatable input', () => {
                render(<Select {...creatablePropsNoOptions} />);
                expect(document.getElementsByClassName('.ts-Input')).toBeDefined();
            });

            it('Render creatable input with value', () => {
                render(<Select {...creatablePropsNoOptions} value="testValue" />);
                expect(screen.getByDisplayValue('testValue')).toBeDefined();
            });

            it('Test creatable input property onChange - no options', () => {
                const onChangeFn = jest.fn();
                render(<Select {...creatablePropsNoOptions} onChange={onChangeFn} />);
                const input = screen.getByRole('textbox');
                expect(input).toBeDefined();
                fireEvent.change(input, { target: { value: 'new value' } });
                expect(onChangeFn).toHaveBeenCalled();
                expect(onChangeFn).toHaveBeenCalledWith('select', 'new value');
            });

            it('Test creatable input property required', () => {
                render(
                    <Select
                        {...creatablePropsNoOptions}
                        guiOptions={{
                            ...creatablePropsNoOptions.guiOptions,
                            mandatory: true
                        }}
                    />
                );
                expect(document.getElementsByClassName('.is-required')).toBeDefined();
            });

            it('Test creatable input property description', () => {
                render(
                    <Select
                        {...creatablePropsNoOptions}
                        guiOptions={{
                            ...creatablePropsNoOptions.guiOptions,
                            hint: 'testInfo'
                        }}
                    />
                );
                expect(screen.getByTitle('testInfo')).toBeDefined();
            });

            it('Test creatable input property errorMessage', () => {
                render(<Select {...creatablePropsNoOptions} errorMessage="testErrorMessage" />);
                expect(screen.getByRole('alert')).toBeDefined();
            });

            it('Test creatable input property placeholder', () => {
                render(
                    <Select
                        {...creatablePropsNoOptions}
                        guiOptions={{
                            ...creatablePropsNoOptions.guiOptions,
                            placeholder: 'testPlaceholder'
                        }}
                    />
                );
                expect(screen.getByPlaceholderText('test input placeholder')).toBeDefined();
            });

            it('Test creatable input property pending', () => {
                render(<Select {...creatablePropsNoOptions} pending={true} />);
                expect(document.getElementsByClassName('ms-Spinner-circle')).toBeDefined();
            });
        });
    });

    it('Auto-selects the option with checked=true as the default value', () => {
        const onChangeFn = jest.fn();
        render(<Select {...props} onChange={onChangeFn} choices={[{ name: 'Dummy', value: 111 }]} />);
        const input = screen.getByRole('combobox');
        expect(input).toBeDefined();
        expect(onChangeFn).toHaveBeenCalledWith('select', 111);
    });

    it('Select checked value as default', async () => {
        const onChangeFn = jest.fn();
        const promptsWithChecked = {
            ...props,
            choices: [
                { name: 'testText0', value: 'testValue0' },
                { name: 'testText1', value: 'testValue1', checked: true }
            ]
        };
        render(<Select {...promptsWithChecked} onChange={onChangeFn} />);
        const input = screen.getByRole('combobox');
        expect(input).toBeDefined();
        expect(onChangeFn).toHaveBeenCalledWith('select', 'testValue1');
    });

    it('displays disabled option with tooltip in Select component', async () => {
        const onChangeFn = jest.fn();
        const propmtsWithDisabled = {
            ...props,
            choices: [
                { name: 'testText0', value: 'testValue0' },
                { name: 'testText1', value: 'testValue1', disabled: true, title: 'Option is disabled' }
            ]
        };
        render(<Select {...propmtsWithDisabled} onChange={onChangeFn} />);
        const input = screen.getByRole('combobox');
        expect(input).toBeDefined();

        // Open dropdown
        const button = document.getElementsByClassName('ms-Button')[0];
        fireEvent.click(button);

        const options = screen.queryAllByRole('option');
        expect(options).toHaveLength(2);

        expect(options[1].textContent).toBe('testText1');
        expect(options[1].title).toBe('Option is disabled');
    });
});
