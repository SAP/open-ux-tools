import { MessageBarType, showInfoCenterMessage } from '@sap-ux-private/control-property-editor-common';
import { CommunicationService } from '../cpe/communication-service';
import { getTextBundle } from '../i18n';

/**
 * Localization key interface for defining message keys and optional parameters.
 */
interface LocalizationKey {
    key: string;
    params?: string[];
}

/**
 * InfoCenterMessage interface for defining the structure of an Info center message.
 * It includes title, description, optional details, and type.
 */
interface InfoCenterMessage {
    title: LocalizationKey | string;
    description: LocalizationKey | string;
    details?: LocalizationKey | string;
    type: MessageBarType;
}

/**
 * Shows a localized/plain string message in the Info center.
 *
 * @param {InfoCenterMessage} message - The message object containing title, description,
 * details and type for the message. Each text in the message can be localized or
 * left as a plain string.
 */
export async function sendInfoCenterMessage({ title, description, details, type }: InfoCenterMessage): Promise<void> {
    CommunicationService.sendAction(
        showInfoCenterMessage({
            title: (await getTranslation(title))!,
            description: (await getTranslation(description))!,
            details: await getTranslation(details),
            type
        })
    );
}

/**
 * Util function which returns translation for a localization key or a plain string.
 * If the value is undefined, it returns undefined.
 *
 * @param {LocalizationKey | string | undefined} value - The localization key, plain string or undefined.
 * @returns {Promise<string>} A promise that resolves to the translated string.
 */
async function getTranslation(value: LocalizationKey | string | undefined): Promise<string | undefined> {
    if (value === undefined) {
        return undefined;
    }

    if (typeof value === 'string') {
        return value;
    }

    const bundle = await getTextBundle();
    return bundle.getText(value.key, value.params);
}
