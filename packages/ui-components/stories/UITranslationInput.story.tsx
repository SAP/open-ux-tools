import React from 'react';
import { IStackTokens, setFocusVisibility } from '@fluentui/react';
import { Stack } from '@fluentui/react';
import type { I18nBundle, TranslationEntry } from '../src/components/UITranslationInput';
import { TranslationTextPattern, UITranslationInput } from '../src/components/UITranslationInput';
import { initIcons, UiIcons } from '../src/components/Icons';
import { ColumnControlType, UIColumn, UITable } from '../src/components/UITable';
import { UIIconButton } from '../src/components/UIButton';

export default { title: 'Basic Inputs/Input' };

interface I18nTableRow {
    key: string;
    value: string;
}

interface I18nTableProps {
    tableData: Array<I18nTableRow>;
    onDelete: (key: string) => void;
}

initIcons();

const stackTokens: IStackTokens = { childrenGap: 40 };

const I18N_BUNDLE_KEY = 'ui-components-i18n-bundle';
const getI18nBundle = (): I18nBundle => {
    let i18nBundle: I18nBundle = {};
    try {
        i18nBundle = JSON.parse(window.localStorage.getItem(I18N_BUNDLE_KEY) || '') as I18nBundle;
    } catch (e) {
        i18nBundle = {};
    }
    return i18nBundle;
};

const updateI18nBundle = (i18nBundle: I18nBundle): void => {
    window.localStorage.setItem(I18N_BUNDLE_KEY, JSON.stringify(i18nBundle));
};

export const translationInput = () => {
    const [value, setValue] = React.useState('Content');
    const [i18nBundle, setI18nBundle] = React.useState(getI18nBundle());
    const onChange = (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => {
        setValue(newValue || '');
    };
    const onCreateNewEntry = (entry: TranslationEntry) => {
        if (!i18nBundle[entry.key.value]) {
            i18nBundle[entry.key.value] = [entry];
            updateI18nBundle(i18nBundle);
            setI18nBundle({ ...i18nBundle });
        }
    };
    const onShowExistingEntry = (entry: TranslationEntry) => {
        const cell = document.querySelector(`div[data-i18n-key="${entry.key.value}"]`) as HTMLElement;
        (cell?.parentElement as HTMLElement).focus();
        setFocusVisibility(true, cell?.parentElement as HTMLElement);
    };
    // Table event to delete i18n entry
    const onDeleteEntry = (key: string) => {
        if (i18nBundle[key]) {
            delete i18nBundle[key];
            updateI18nBundle(i18nBundle);
            setI18nBundle({ ...i18nBundle });
        }
    };

    const tableData: Array<I18nTableRow> = [];
    for (const key in i18nBundle) {
        const entries = i18nBundle[key];
        for (const entry of entries) {
            tableData.push({
                key,
                value: entry.value.value
            });
        }
    }

    return (
        <Stack
            tokens={stackTokens}
            style={{
                width: '100%',
                height: '100%'
            }}>
            <UITranslationInput
                entries={i18nBundle}
                id="test"
                i18nPrefix="i18n"
                allowedPatterns={[
                    TranslationTextPattern.SingleBracketBinding,
                    TranslationTextPattern.DoubleBracketReplace
                ]}
                defaultPattern={TranslationTextPattern.SingleBracketBinding}
                value={value}
                onChange={onChange}
                onCreateNewEntry={onCreateNewEntry}
                onShowExistingEntry={onShowExistingEntry}
            />
            <I18nTable tableData={tableData} onDelete={onDeleteEntry} />
        </Stack>
    );
};

function I18nTable(props: I18nTableProps) {
    const columnsWithDropdown: UIColumn[] = Array.from({ length: 3 }).map((item, index) => {
        const col: UIColumn = {
            key: 'test' + (index + 1),
            name: '',
            fieldName: '',
            minWidth: 100,
            maxWidth: 300
        };
        if (index === 0) {
            col.name = 'Key';
            col.fieldName = 'key';
            col.onRender = (item: I18nTableRow) => {
                return <div data-i18n-key={item.key}>{item.key}</div>;
            };
        } else if (index === 1) {
            col.name = 'Value';
            col.fieldName = 'value';
        } else if (index === 2) {
            col.name = 'Delete';
            col.minWidth = 50;
            col.maxWidth = 50;
            col.onRender = (item: I18nTableRow) => {
                return (
                    <UIIconButton
                        onClick={() => {
                            props.onDelete(item.key);
                        }}
                        iconProps={{ iconName: UiIcons.TrashCan }}
                    />
                );
            };
        }
        return col;
    });

    return (
        <div
            style={{
                position: 'relative',
                height: '100%'
            }}>
            <UITable dataSetKey={'datasetkey'} items={props.tableData} columns={columnsWithDropdown} />
        </div>
    );
}
