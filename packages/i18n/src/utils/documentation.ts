import { I18nEntry } from "../types";
import { printPropertiesI18nAnnotation } from "./print";
import { i18n } from './../i18n';

export type MarkdownString = string;

/**
 * Get documentation for i18n entry
 */
export const getI18nDocumentation = (entry: I18nEntry): MarkdownString => {
    const documentation: MarkdownString[] = [];
    const key = `**${i18n.t('Text_Key')}:** ${entry.key.value}`;
    const value = `**${i18n.t('Text_Value')}:** ${entry.value.value}`;
    documentation.push(key, value);
    if (entry.annotation) {
        const annotationText = printPropertiesI18nAnnotation(entry.value.value, {
            maxLength: entry.annotation.maxLength?.value,
            textType: entry.annotation.textType.value,
            note: entry.annotation.note?.value
        });
        documentation.push(`**${i18n.t('Additional_Information')}:** ${annotationText}`);
    }
    return documentation.join('\n\n');
};
