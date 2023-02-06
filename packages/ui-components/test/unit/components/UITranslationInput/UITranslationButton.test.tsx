import * as React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { UiIcons, initIcons } from '../../../../src/components';
import type { UITranslationInputProps } from '../../../../src/components/UITranslationInput';
import {
    UITranslationInput,
    TranslationTextPattern,
    TranslationKeyGenerator
} from '../../../../src/components/UITranslationInput';
import { getBundle, acceptCallout, SELECTORS } from './utils';

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

    test('Render', () => {
        const { container } = render(
            <UITranslationInput
                id={id}
                entries={entries}
                allowedPatterns={[TranslationTextPattern.SingleBracketBinding]}
                defaultPattern={TranslationTextPattern.SingleBracketBinding}
                i18nPrefix={''}
            />
        );
        expect(container.querySelectorAll(selectors.input).length).toEqual(1);
        expect(container.querySelectorAll(selectors.button).length).toEqual(1);
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
            value: 'dummy1',
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
            const { container } = render(
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
            expect(container.querySelectorAll(selectors.callout).length).toEqual(0);
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
            name: 'Existing value',
            defaultPattern: TranslationTextPattern.SingleBracketBinding,
            allowedPatterns: [TranslationTextPattern.SingleBracketBinding],
            namingConvention: TranslationKeyGenerator.CamelCase,
            value: '{i18n>dummy1}',
            result: {
                entry: {
                    key: 'dummy1',
                    value: 'dummy1'
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
});
