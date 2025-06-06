import { IconName } from '../../icons';

const localeTimeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
const localeDateOptions: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: '2-digit' };

/**
 * Gets locale.
 *
 * @returns string
 */
function getLocale(): string {
    if (globalThis?.navigator?.languages) {
        const supportedLocales = Intl.DateTimeFormat.supportedLocalesOf([...globalThis.navigator.languages], {
            ...localeDateOptions,
            ...localeTimeOptions
        });
        if (supportedLocales.length) {
            return supportedLocales[0];
        }
    }
    return 'en-GB';
}

/**
 * Gets formatted date time based on locale.
 *
 * @param timestamp number
 * @returns string
 */
export function getFormattedDateAndTime(timestamp: number): string {
    const date = new Date(timestamp);
    const locale = getLocale();

    return `${date.toLocaleTimeString(locale, localeTimeOptions)} ${date.toLocaleDateString(
        locale,
        localeDateOptions
    )}`;
}

/**
 * Get value icon based on type.
 *
 * @param value string | number | boolean
 * @returns string | undefined
 */
export function getValueIcon(value: string | number | boolean | undefined): string | undefined {
    if (typeof value === 'string') {
        if (value.trim().startsWith('{') && value.trim().endsWith('}')) {
            return IconName.expression;
        } else {
            return IconName.string;
        }
    } else if (typeof value === 'number') {
        return IconName.number;
    } else if (typeof value === 'boolean') {
        if (value === true) {
            return IconName.boolTrue;
        } else {
            return IconName.boolFalse;
        }
    }
    return undefined;
}
