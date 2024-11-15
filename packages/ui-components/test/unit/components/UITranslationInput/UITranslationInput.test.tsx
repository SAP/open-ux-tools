import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
        callout: '.ms-Callout',
        loader: '.ms-Spinner',
        inputField: '.ui-translatable__field'
    };

    const getButtonIdSelector = (id: string, goToCode = false): string => {
        id = `#${id}-i18n`;
        if (goToCode) {
            id += '-navigate';
        }
        return id;
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

    const isLoading = (): boolean => {
        return !!document.querySelectorAll(selectors.loader).length;
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

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
        expect(container.querySelectorAll(getButtonIdSelector(id, false)).length).toEqual(1);
        expect(container.querySelectorAll(getButtonIdSelector(id, true)).length).toEqual(0);
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
                },
                title: "Value: '{i18n>dummy1}'.\nTranslation: 'dummy1 text'."
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
                },
                title: "Value: '{i18n>Dummy1}'.\nTranslation: 'Dummy1 text'."
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
                    onShowExistingEntry={onShowExistingEntryMock}
                />
            );

            clickI18nButton(false);
            // Check if callbacks executed
            expect(onCreateNewEntryMock).toBeCalledTimes(0);
            expect(onChangeMock).toBeCalledTimes(0);
            expect(onUpdateValueMock).toBeCalledTimes(0);
            expect(container.querySelectorAll(getButtonIdSelector(id, false)).length).toEqual(0);
            expect(container.querySelectorAll(getButtonIdSelector(id, true)).length).toEqual(1);
            expect(onShowExistingEntryMock).toBeCalledTimes(1);
            expect(onShowExistingEntryMock).toBeCalledWith({
                'key': { 'value': result.entry.key },
                'value': { 'value': result.entry.value }
            });
            // Check title
            expect(container.querySelector(`${selectors.input} input`)?.getAttribute('title')).toEqual(null);
            expect(
                container.querySelector(`${selectors.input} ${selectors.inputField}`)?.getAttribute('title')
            ).toEqual(result.title);
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
        let setTimeoutSpy: jest.SpyInstance;
        beforeEach(() => {
            setTimeoutSpy = jest.spyOn(window, 'setTimeout');
        });
        test('Test "busy" property', () => {
            const props = {
                id: id,
                entries: entries,
                allowedPatterns: [TranslationTextPattern.SingleBracketBinding],
                defaultPattern: TranslationTextPattern.SingleBracketBinding,
                i18nPrefix: 'i18n',
                value: 'test',
                busy: {
                    busy: true
                }
            };
            const { rerender } = render(<UITranslationInput {...props} />);
            expect(isLoading()).toEqual(true);
            props.busy = { busy: false };
            rerender(<UITranslationInput {...props} />);
            expect(isLoading()).toEqual(false);
        });

        test('Test "useMinWaitingTime" property', () => {
            const props = {
                id: id,
                entries: entries,
                allowedPatterns: [TranslationTextPattern.SingleBracketBinding],
                defaultPattern: TranslationTextPattern.SingleBracketBinding,
                i18nPrefix: 'i18n',
                value: 'test',
                busy: {
                    busy: true,
                    useMinWaitingTime: true
                }
            };
            const { rerender } = render(<UITranslationInput {...props} />);
            expect(isLoading()).toEqual(true);
            expect(setTimeoutSpy).toBeCalledTimes(1);
            expect(setTimeoutSpy.mock.calls[0][1]).toEqual(500);
            // Try to release loader - it still should busy, because min waiting time was not completed
            props.busy = { busy: false, useMinWaitingTime: true };
            rerender(<UITranslationInput {...props} />);
            expect(isLoading()).toEqual(true);
            // Simulate timeout handler
            setTimeoutSpy.mock.calls[0][0]();
            expect(isLoading()).toEqual(false);
        });
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

    test('Test "string" property', () => {
        const acceptButtonLabel = 'Dummy accept';
        render(
            <UITranslationInput
                id={id}
                entries={entries}
                allowedPatterns={[TranslationTextPattern.SingleBracketBinding]}
                defaultPattern={TranslationTextPattern.SingleBracketBinding}
                i18nPrefix={'i18n'}
                value={'new value'}
                strings={{
                    acceptButtonLabel,
                    cancelButtonLabel: '',
                    i18nKeyMissingTooltip: '',
                    i18nKeyMissingDescription: '',
                    i18nValueMissingTooltip: '',
                    i18nValueMissingDescription: '',
                    i18nReplaceWithExistingTooltip: '',
                    i18nReplaceWithExistingDescription: '',
                    i18nEntryExistsTooltip: '',
                    i18nEntryExistsInputTooltip: ''
                }}
            />
        );
        clickI18nButton();
        expect(screen.getByText(acceptButtonLabel)).toBeDefined();
    });

    test('Test "string" property', () => {
        const externalTitle = 'dummy';
        const { container } = render(
            <UITranslationInput
                id={id}
                value={'{i18n>dummy1}'}
                entries={entries}
                allowedPatterns={[TranslationTextPattern.SingleBracketBinding]}
                defaultPattern={TranslationTextPattern.SingleBracketBinding}
                namingConvention={TranslationKeyGenerator.CamelCase}
                title={externalTitle}
                i18nPrefix={'i18n'}
            />
        );
        // Check title
        expect(container.querySelector(`${selectors.input} ${selectors.inputField}`)?.getAttribute('title')).toEqual(
            externalTitle
        );
    });
});
