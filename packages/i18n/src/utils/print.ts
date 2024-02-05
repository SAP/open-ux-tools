import type { I18nAnnotation } from '../types';
import { getI18nMaxLength, getI18nTextType } from './text';

/**
 * Creates annotation text in .properties file format
 * If no annotation is not provided, default one is generated based on text.
 *
 * @param text text
 * @param annotation Context information for the text
 * @returns printed i18n annotation
 */
export function printPropertiesI18nAnnotation(text: string, annotation?: string | I18nAnnotation): string {
    if (!annotation) {
        const maxLen = getI18nMaxLength(text);
        const textType = getI18nTextType(maxLen);
        return `${textType},${maxLen}`;
    }

    if (typeof annotation === 'string') {
        const prefix = text.length <= 120 ? 'X' : 'Y';
        return `${prefix}${annotation}`;
    }

    if (typeof annotation === 'object') {
        const { textType, note, maxLength } = annotation;
        const fragments: string[] = [textType];

        if (maxLength !== undefined) {
            fragments.push(',', maxLength.toString());
        }

        if (note) {
            fragments.push(':', ' ', note.trim());
        }

        return fragments.join('');
    }
    return '';
}

/**
 * Creates text for i18n entry for `.properties` file format
 * If no annotation is not present, generic default one will be generated based on the text.
 *
 * @param key key
 * @param text text
 * @param annotation Context information for the text
 * @returns printed i18n entries
 */
export function printPropertiesI18nEntry(key: string, text: string, annotation?: string | I18nAnnotation): string {
    const annotationText = printPropertiesI18nAnnotation(text, annotation);
    const comment = `#${annotationText}`;
    const keyValue = `${key}=${text}`;
    return `\n${comment}\n${keyValue}\n`;
}
