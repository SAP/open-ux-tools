import * as React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { initIcons } from '../../../../src/components';
import {
    UITranslationInput,
    TranslationTextPattern,
    TranslationKeyGenerator
} from '../../../../src/components/UITranslationInput';
import { getBundle } from './utils';

describe('<UITranslationInput />', () => {
    initIcons();

    const id = 'test';
    const entries = getBundle();

    const selectors = {
        input: '.ms-TextField',
        button: '.ms-Button',
        callout: '.ms-Callout'
    };

    const clickI18nButton = (expectCallout = true) => {
        const openBtn = document.querySelector(selectors.button) as HTMLElement;
        fireEvent.click(openBtn);
        expect(document.querySelectorAll(selectors.callout).length).toEqual(expectCallout ? 1 : 0);
    };

    const acceptCallout = (id: string): void => {
        const acceptBtn = document.querySelector(`#${id}-i18n-button-action-confirm`) as HTMLElement;
        fireEvent.click(acceptBtn);
    };

    const rejectCallout = (id: string): void => {
        const acceptBtn = document.querySelector(`#${id}-i18n-button-action-cancel`) as HTMLElement;
        fireEvent.click(acceptBtn);
    };

    test('Render', () => {
        const customClassName = 'dummyInput';
        const { container, rerender } = render(
            <UITranslationInput
                id={id}
                entries={entries}
                allowedPatterns={[TranslationTextPattern.SingleBracketBinding]}
                defaultPattern={TranslationTextPattern.SingleBracketBinding}
                i18nPrefix={'i18n'}
                value={'dummy'}
            />
        );
        expect(container.querySelectorAll(selectors.input).length).toEqual(1);
        expect(container.querySelectorAll(selectors.button).length).toEqual(1);
        expect(container.querySelectorAll(`.${customClassName}`).length).toEqual(0);

        rerender(
            <UITranslationInput
                id={id}
                entries={entries}
                allowedPatterns={[TranslationTextPattern.SingleBracketBinding]}
                defaultPattern={TranslationTextPattern.SingleBracketBinding}
                className="dummyInput"
                i18nPrefix={''}
            />
        );
        expect(container.querySelectorAll(`.${customClassName}`).length).toEqual(1);
    });

    const testCases = [
        // New entries
        {
            name: 'Create new single bracket entry',
            defaultPattern: TranslationTextPattern.SingleBracketBinding,
            allowedPatterns: [TranslationTextPattern.SingleBracketBinding],
            value: 'new entry',
            result: {
                create: {
                    key: 'newEntry',
                    value: 'new entry'
                },
                change: '{i18n>newEntry}'
            }
        },
        {
            name: 'Create new double bracket entry',
            defaultPattern: TranslationTextPattern.DoubleBracketReplace,
            allowedPatterns: [TranslationTextPattern.SingleBracketBinding, TranslationTextPattern.DoubleBracketReplace],
            value: 'new entry',
            result: {
                create: {
                    key: 'newEntry',
                    value: 'new entry'
                },
                change: '{{newEntry}}'
            }
        },
        {
            name: 'Create new entry with PascalCase',
            defaultPattern: TranslationTextPattern.SingleBracketBinding,
            allowedPatterns: [TranslationTextPattern.SingleBracketBinding],
            namingConvention: TranslationKeyGenerator.PascalCase,
            value: 'new entry',
            result: {
                create: {
                    key: 'NewEntry',
                    value: 'new entry'
                },
                change: '{i18n>NewEntry}'
            }
        },
        // Create entry for unexisting value
        {
            name: 'Update using existing value',
            defaultPattern: TranslationTextPattern.SingleBracketBinding,
            allowedPatterns: [TranslationTextPattern.SingleBracketBinding],
            value: '{i18n>dummy5}',
            result: {
                create: {
                    key: 'dummy5',
                    value: 'dummy5'
                }
            }
        },
        // Update using existing
        {
            name: 'Update using existing value',
            defaultPattern: TranslationTextPattern.SingleBracketBinding,
            allowedPatterns: [TranslationTextPattern.SingleBracketBinding],
            value: 'dummy1 text',
            result: {
                create: undefined,
                change: '{i18n>dummy1}'
            }
        }
    ];

    test.each(testCases)(
        '$name, value=$value, defaultPattern=$defaultPattern, allowedPatterns=$allowedPatterns, namingConvention=$namingConvention',
        ({ defaultPattern, allowedPatterns, namingConvention, value, result }) => {
            const onCreateNewEntryMock = jest.fn();
            const onChangeMock = jest.fn();
            const onUpdateValueMock = jest.fn();
            render(
                <UITranslationInput
                    id={id}
                    value={value}
                    entries={entries}
                    allowedPatterns={allowedPatterns}
                    defaultPattern={defaultPattern}
                    namingConvention={namingConvention}
                    i18nPrefix={'i18n'}
                    onCreateNewEntry={onCreateNewEntryMock}
                    onChange={onChangeMock}
                />
            );

            clickI18nButton();
            acceptCallout(id);
            // Check if callout closed
            expect(document.querySelectorAll(selectors.callout).length).toEqual(0);
            // Check if callbacks executed
            if (result.create) {
                expect(onCreateNewEntryMock).toBeCalledTimes(1);
                expect(onCreateNewEntryMock).toBeCalledWith({
                    'key': { 'value': result.create.key },
                    'value': { 'value': result.create.value }
                });
            } else {
                expect(onCreateNewEntryMock).toBeCalledTimes(0);
            }
            if (result.change) {
                expect(onChangeMock).toBeCalledTimes(1);
                expect(onChangeMock.mock.calls[0][1]).toEqual(result.change);
            } else {
                expect(onChangeMock).toBeCalledTimes(0);
            }

            expect(onUpdateValueMock).toBeCalledTimes(0);
        }
    );

    const existinnEntriesTestCases = [
        // Existing entry
        {
            name: 'Existing value - camel case',
            defaultPattern: TranslationTextPattern.SingleBracketBinding,
            allowedPatterns: [TranslationTextPattern.SingleBracketBinding],
            namingConvention: TranslationKeyGenerator.CamelCase,
            value: '{i18n>dummy1}',
            result: {
                entry: {
                    key: 'dummy1',
                    value: 'dummy1 text'
                }
            }
        },
        {
            name: 'Existing value - pascal case',
            defaultPattern: TranslationTextPattern.SingleBracketBinding,
            allowedPatterns: [TranslationTextPattern.SingleBracketBinding],
            namingConvention: TranslationKeyGenerator.PascalCase,
            value: '{i18n>Dummy1}',
            result: {
                entry: {
                    key: 'Dummy1',
                    value: 'Dummy1 text'
                }
            }
        }
    ];

    test.each(existinnEntriesTestCases)(
        '$name, value=$value, defaultPattern=$defaultPattern, allowedPatterns=$allowedPatterns, namingConvention=$namingConvention',
        ({ defaultPattern, allowedPatterns, namingConvention, value, result }) => {
            const onCreateNewEntryMock = jest.fn();
            const onChangeMock = jest.fn();
            const onUpdateValueMock = jest.fn();
            const onShowExistingEntryMock = jest.fn();
            render(
                <UITranslationInput
                    id={id}
                    value={value}
                    entries={entries}
                    allowedPatterns={allowedPatterns}
                    defaultPattern={defaultPattern}
                    namingConvention={namingConvention}
                    i18nPrefix={'i18n'}
                    onCreateNewEntry={onCreateNewEntryMock}
                    onChange={onChangeMock}
                    onShowExistingEntry={onShowExistingEntryMock}
                />
            );

            clickI18nButton(false);
            // Check if callbacks executed
            expect(onCreateNewEntryMock).toBeCalledTimes(0);
            expect(onChangeMock).toBeCalledTimes(0);
            expect(onUpdateValueMock).toBeCalledTimes(0);
            expect(onShowExistingEntryMock).toBeCalledTimes(1);
            expect(onShowExistingEntryMock).toBeCalledWith({
                'key': { 'value': result.entry.key },
                'value': { 'value': result.entry.value }
            });
        }
    );

    test('Empty value', () => {
        const { container } = render(
            <UITranslationInput
                id={id}
                entries={entries}
                allowedPatterns={[TranslationTextPattern.SingleBracketBinding]}
                defaultPattern={TranslationTextPattern.SingleBracketBinding}
                i18nPrefix={'i18n'}
                value={' '}
            />
        );
        expect(container.querySelectorAll(selectors.input).length).toEqual(1);
        expect(container.querySelectorAll(selectors.button).length).toEqual(0);
    });

    test('Test "disabled" property', () => {
        const { container } = render(
            <UITranslationInput
                id={id}
                entries={entries}
                allowedPatterns={[TranslationTextPattern.SingleBracketBinding]}
                defaultPattern={TranslationTextPattern.SingleBracketBinding}
                i18nPrefix={'i18n'}
                value={'test'}
                disabled={true}
            />
        );
        const input = container.querySelector(`${selectors.input} input`);
        expect(input?.getAttribute('readonly')).toEqual('');
    });

    describe('Close callout', () => {
        test('Cancel callout', () => {
            render(
                <UITranslationInput
                    id={id}
                    entries={entries}
                    allowedPatterns={[TranslationTextPattern.SingleBracketBinding]}
                    defaultPattern={TranslationTextPattern.SingleBracketBinding}
                    i18nPrefix={'i18n'}
                    value={'new value'}
                />
            );
            clickI18nButton();
            expect(document.querySelectorAll(selectors.callout).length).toEqual(1);
            rejectCallout(id);
            expect(document.querySelectorAll(selectors.callout).length).toEqual(0);
        });

        test('Click outside of callout', async () => {
            render(
                <UITranslationInput
                    id={id}
                    entries={entries}
                    allowedPatterns={[TranslationTextPattern.SingleBracketBinding]}
                    defaultPattern={TranslationTextPattern.SingleBracketBinding}
                    i18nPrefix={'i18n'}
                    value={'new value'}
                />
            );
            clickI18nButton();
            expect(document.querySelectorAll(selectors.callout).length).toEqual(1);
            await new Promise((resolve) => setTimeout(resolve, 1));
            fireEvent.click(document.body);
            expect(document.querySelectorAll(selectors.callout).length).toEqual(0);
        });
    });
});
