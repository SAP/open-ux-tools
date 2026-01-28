import type { TFunction } from 'i18next';

/**
 * Validates a URL and returns an error message if the URL has a pathname beyond '/'.
 *
 * @param value - the URL string to validate
 * @param t - the translation function
 * @param setIsDetailsValid - function to set the validation status
 * @returns - the error message if validation fails, undefined otherwise
 */
export const getUrlErrorMessage = (
    value: string,
    t: TFunction,
    setIsDetailsValid: (isValid: boolean) => void
): string | undefined => {
    let urlMessage: string | undefined;
    try {
        const url = new URL(value);
        if (url.pathname && url.pathname !== '/') {
            setIsDetailsValid(false);
            urlMessage = t('validations.systemUrlOriginOnlyWarning');
        }
        setIsDetailsValid(true);
    } catch {
        // ignore
    }
    return urlMessage;
};
