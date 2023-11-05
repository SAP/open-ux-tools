import type { ReactElement } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Text, Stack } from '@fluentui/react';

import { UIIcon, UIIconButton, UiIcons } from '@sap-ux/ui-components';

import type {
    Control,
    SavedPropertyChange,
    PendingPropertyChange
} from '@sap-ux-private/control-property-editor-common';
import { Separator } from '../../components';
import type { RootState } from '../../store';

import styles from './PropertyDocumentation.module.scss';

export interface PropertyDocumentationProps {
    defaultValue: string;
    title?: string;
    description: string;
    propertyName: string;
    propertyType: string | undefined;
    onDelete?(controlId: string, propertyName: string): void;
}
/**
 * React element PropertyDocumentation.
 *
 * @param propDocProps PropertyDocumentationProps
 * @returns ReactElement
 */
export function PropertyDocumentation(propDocProps: PropertyDocumentationProps): ReactElement {
    const { propertyName, title, defaultValue, description, propertyType, onDelete } = propDocProps;
    const { t } = useTranslation();

    const control = useSelector<RootState, Control | undefined>((state) => state.selectedControl);

    const propertyChanges = useSelector<
        RootState,
        | {
              pending: number;
              saved: number;
              lastSavedChange?: SavedPropertyChange;
              lastChange?: PendingPropertyChange;
          }
        | undefined
    >((state) => state.changes.controls[control?.id ?? '']?.properties[propertyName]);

    return (
        <>
            <Stack
                id={`${propertyName}--PropertyTooltip-Header`}
                horizontal
                horizontalAlign="space-between"
                className={styles.header}>
                <Stack.Item>
                    <Text className={styles.title}>{title}</Text>
                </Stack.Item>
                {propertyChanges && (
                    <Stack.Item>
                        <Modified {...propertyChanges} />
                    </Stack.Item>
                )}
            </Stack>
            <Stack
                className={styles.container}
                tokens={{
                    childrenGap: '10px'
                }}>
                <Stack.Item>
                    <section id={`${propertyName}--PropertyTooltip-Content`} className={styles.grid}>
                        <DocumentationRow label={t('PROPERTY_NAME')} value={propertyName} />
                        <DocumentationRow label={t('PROPERTY_TYPE')} value={propertyType} />
                        <>
                            <Text className={styles.propertyName}>{t('DEFAULT_VALUE')}</Text>
                            <Text title={defaultValue?.toString()} className={styles.bold}>
                                {defaultValue?.toString()}
                            </Text>
                            <UIIcon
                                className={styles.infoIcon}
                                iconName={UiIcons.Info}
                                title={t('DEFAULT_VALUE_TOOLTIP')}
                            />
                        </>
                        {propertyChanges?.lastChange && (
                            <>
                                <Text className={styles.propertyName}>{t('CURRENT_VALUE')}</Text>
                                <Text
                                    title={propertyChanges.lastChange.value.toString()}
                                    className={[styles.bold, styles.propertyWithNoActions].join(' ')}>
                                    {propertyChanges.lastChange.value.toString()}
                                </Text>
                            </>
                        )}
                        {propertyChanges?.lastSavedChange && (
                            <>
                                <Text className={styles.propertyName}>{t('SAVED_VALUE')}</Text>
                                <Text title={propertyChanges.lastSavedChange.value.toString()} className={styles.bold}>
                                    {propertyChanges.lastSavedChange.value.toString()}
                                </Text>
                                <UIIconButton
                                    iconProps={{ iconName: UiIcons.TrashCan }}
                                    title={t('DELETE_ALL_PROPERTY_CHANGES_TOOLTIP')}
                                    onClick={(): void => {
                                        if (control?.id) {
                                            onDelete(control.id, propertyName);
                                        }
                                    }}
                                />
                            </>
                        )}
                    </section>
                </Stack.Item>
                <Stack.Item>
                    <Separator />
                </Stack.Item>
                <Stack.Item>
                    <Text id={`${propertyName}--PropertyTooltip-Footer`} className={styles.description}>
                        {description}
                    </Text>
                </Stack.Item>
            </Stack>
        </>
    );
}
interface ModifiedProps {
    saved: number;
    pending: number;
}
/**
 * React element Modified.
 *
 * @param modifiedProps ModifiedProps
 * @returns ReactElement
 */
function Modified(modifiedProps: ModifiedProps): ReactElement {
    const { pending, saved } = modifiedProps;
    const { t } = useTranslation();
    if (saved > 0 && pending === 0) {
        return <Text className={styles.savedChanges}>{t('SAVED_CHANGES')}</Text>;
    }

    if (pending > 0 && saved === 0) {
        return <Text className={styles.unsavedChanges}>{t('UNSAVED_CHANGES')}</Text>;
    }
    return <Text className={styles.unsavedChanges}>{t('SAVED_AND_UNSAVED_CHANGES')}</Text>;
}

interface DocumentationRowProps {
    label: string;
    value?: string;
}

/**
 * React element DocumentationRow.
 *
 * @param documentationRowProps DocumentationRowProps
 * @returns ReactElement
 */
function DocumentationRow(documentationRowProps: DocumentationRowProps): ReactElement {
    const { label, value } = documentationRowProps;
    if (!value) {
        return <></>;
    }
    return (
        <>
            <Text className={styles.propertyName}>{label}</Text>
            <Text title={value} className={[styles.value, styles.propertyWithNoActions].join(' ')}>
                {value}
            </Text>
        </>
    );
}
