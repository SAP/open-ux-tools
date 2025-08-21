import i18next from 'i18next';
import type { TranslationBundles, SupportedAggregationAction, PropertyPath, PropertyMessage } from '../types';
import type { JSONSchema4 } from 'json-schema';
import type { ObjectAggregation } from '../ObjectAggregation';
import { AggregationActions, ValidationState, PropertyMessageType } from '../types';
import { getI18nBundleName, getRelevantI18nBundle, resolveI18nValue } from './i18n';
import type { ProjectType } from '@sap-ux/project-access';

export interface AppTranslationBundleData {
    bundles: TranslationBundles;
    projectType?: ProjectType;
}

/**
 * Method returns application specific i18n bundle data.
 *
 * @returns i18n bundle data.
 */
export const getAppI18nBundle = (): AppTranslationBundleData => {
    return {
        bundles: {
            annotation: {},
            app: {},
            service: {},
            ui5: {}
        }
    };
};

export const getTechnicalIdFromPath = (path: PropertyPath, firstOnly = false): string | undefined => {
    const key = path[path.length - 1];
    if (key) {
        let id = key.toString();
        const separator = id.includes(':::') ? ':::' : '::';
        const parts = key.toString().split(separator);
        id = parts[0];
        if (!firstOnly && parts.length > 1) {
            // remove first entry
            parts.splice(0, 1);
            id = parts.join('/');
        }
        if (id) {
            return id;
        }
    }
};

/**
 * Method disables deletion of last annotation node if there is any custom nodes.
 * There can be cases when custom nodes referenced to last annotation node and by deleting last annotation node, we can not provide correct order.
 *
 * @param aggregation Container aggregation.
 * @param text I18n key for disabled deletion explanation.
 */
export const ensureLastNodeIsUndeletable = (aggregation: ObjectAggregation, text: string): void => {
    // Find if there is very last node
    // Should be undefined if there is two annotation nodes
    let lastNativeNode: ObjectAggregation | undefined;
    let nativeNodes = 0;
    let customNodeExists = false;
    for (const key in aggregation.aggregations) {
        if (!aggregation.aggregations[key].custom) {
            lastNativeNode = nativeNodes > 0 ? undefined : aggregation.aggregations[key];
            nativeNodes++;
        } else {
            customNodeExists = true;
        }
    }
    // Check if signle and last annotation node exists with actions
    if (!customNodeExists || !lastNativeNode?.actions) {
        return;
    }
    // Find deletion action
    const index = lastNativeNode.actions.findIndex(
        (action: SupportedAggregationAction | AggregationActions): boolean =>
            action === AggregationActions.Delete ||
            (typeof action === 'object' && action.type === AggregationActions.Delete)
    );
    if (index !== -1) {
        let deleteAction = lastNativeNode.actions[index];
        if (typeof deleteAction !== 'object') {
            // Simple string - make object which allow to disable action
            deleteAction = {
                type: deleteAction
            };
        }
        // Disable actiondeletion
        deleteAction.disabled = true;
        deleteAction.title = i18next.t(text);
        lastNativeNode.actions[index] = deleteAction;
    }
};

/**
 * Function validates extension using validation parameter by setting warning message to aggregation.
 *
 * @param aggregation aggregation for which to set warning message.
 * @param isValid validation result.
 * @param description description to show in case extension is invalid.
 * @param property name of the property
 */
export const validateExtension = (
    aggregation: ObjectAggregation,
    isValid: boolean,
    description: string,
    property?: string
): void => {
    if (!isValid) {
        aggregation.state = ValidationState.Invalid;
        aggregation.messages = [
            {
                text: description,
                type: PropertyMessageType.Warning
            }
        ];
        aggregation.inactive = true;
        if (property && aggregation.properties[property]) {
            addValidationMessages(aggregation.properties[property], [{ text: description }]);
        }
    }
};

/**
 * Function validates macros extension key by checking aggregation value of it.
 *
 * @param aggregation aggregation for which to set warning message.
 * @param value value of custom extension aggregation.
 */
export const validateMacrosExtension = (aggregation: ObjectAggregation, value = aggregation.value): void => {
    const extensionValue = value && typeof value === 'object' ? value : {};
    const isKeyDefined = 'key' in extensionValue && !!extensionValue.key;
    // validate custom extension key
    validateExtension(aggregation, isKeyDefined, i18next.t('PAGE_EDITOR_CUSTOM_EXTENSION_NO_KEY'), 'key');
};

/**
 * Method which formats and returns display/description text for anchor selection option.
 * Method resolves i18n translation for text if translation exists.
 *
 * @param i18nKey I18n entry for option.
 * @param aggregation Object aggregation.
 * @param text Anchor label without i18n resolution.
 * @param id Anchor ID.
 * @returns Formatted text for related anchor option.
 */
export const formatAnchorDescriptionText = (
    i18nKey: string,
    aggregation: ObjectAggregation,
    text: string,
    id?: string
): string => {
    const appI18n = getAppI18nBundle();
    const i18nBundle = getRelevantI18nBundle(aggregation, appI18n.bundles, appI18n.projectType);
    const label = resolveI18nValue(text, i18nBundle) || text;
    return id
        ? i18next.t(i18nKey, {
              id,
              label
          })
        : label;
};

/**
 * Method which receives 'oneOf' entries from schema and converts to dropdown option entries.
 *
 * @param i18nKey I18n entry for option.
 * @param aggregation Object aggregation.
 * @param oneOf One of entries from schema.
 * @returns Options for dropdown.
 */
export const oneOfToDropdownOptions = (
    i18nKey: string,
    aggregation: ObjectAggregation,
    oneOf: JSONSchema4[] = []
): { key: string; text: string }[] => {
    return oneOf
        .filter((entry) => !entry.hidden)
        .map((option, index) => {
            const text = option.description || option.const || index.toString();
            return {
                key: option.const || index.toString(),
                text: formatAnchorDescriptionText(i18nKey, aggregation, text, option.const)
            };
        });
};

/**
 * Method returns updated schema for anchor property.
 * Method hides enum entry which is associated with passed aggregation to avoid anchoring extension to itself.
 *
 * @param aggregation Aggregation object.
 * @param originalSchema Schema of anchor property.
 * @returns Modified schema.
 */
export const updateAnchorSchema = (aggregation: ObjectAggregation, originalSchema: JSONSchema4): JSONSchema4 => {
    const anchor = aggregation.name === 'position' ? aggregation.parent?.name : aggregation.name;
    if (originalSchema.enum) {
        // Copy to avoid sharing same reference across other custom columns
        const schema = { ...originalSchema, enum: [...originalSchema.enum] };
        // Handle enum
        const index = schema.enum.findIndex((entry) => entry === anchor);
        if (index !== -1) {
            schema.enum.splice(index, 1);
        }
        return schema;
    } else if (originalSchema.oneOf) {
        const appI18n = getAppI18nBundle();
        // Copy to avoid sharing same reference across other custom columns
        const schema = { ...originalSchema, oneOf: [...originalSchema.oneOf] };
        // Handle oneOf
        for (let i = 0; i < schema.oneOf.length; i++) {
            const entry = schema.oneOf[i];
            entry.bundle = getI18nBundleName(entry.custom, true, !!entry.annotationNodeId, appI18n.projectType);
            // Hide anchors which refers to itself
            if (entry.const === anchor) {
                schema.oneOf[i] = {
                    ...entry,
                    hidden: true
                };
            }
        }
        return schema;
    }
    return originalSchema;
};

/**
 * Method adds validation message to property or node instance.
 *
 * @param instance Property or node instance.
 * @param instance.messages Messages of instance.
 * @param messages Array of validation messages.
 */
export function addValidationMessages(instance: { messages?: PropertyMessage[] }, messages: PropertyMessage[]): void {
    instance.messages ??= [];
    instance.messages.push(...messages);
}

/**
 * Converts a string into "Start Case" format.
 *
 * - Splits words on underscores (`_`), hyphens (`-`), and spaces.
 * - Detects camelCase boundaries (`fooBar` → `Foo Bar`).
 * - Capitalizes the first character of each word.
 * - Preserves acronyms (`FCL`, `WORLD`) when they appear in uppercase.
 *
 * @param text - The input string to convert.
 * @returns The formatted string in start case.
 */
export function startCase(text: string): string {
    let result = '';
    let capitalizeNext = true;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        // Treat separators as spaces
        if (char === '_' || char === '-' || char === ' ') {
            if (result[result.length - 1] !== ' ') {
                result += ' ';
            }
            capitalizeNext = true;
            continue;
        }

        const prev = text[i - 1];
        const next = text[i + 1];

        // Insert space before camelCase or acronym boundaries
        if (
            i > 0 &&
            // lower → UPPER (camelCase)
            ((prev >= 'a' && prev <= 'z' && char >= 'A' && char <= 'Z') ||
                // acronym → next word (like FCLTo)
                (prev >= 'A' && prev <= 'Z' && char >= 'A' && char <= 'Z' && next && next >= 'a' && next <= 'z'))
        ) {
            result += ' ';
            capitalizeNext = true;
        }

        // Apply capitalization inline
        if (capitalizeNext) {
            result += char.toUpperCase();
            capitalizeNext = false;
        } else {
            result += char;
        }
    }

    return result.trim();
}
