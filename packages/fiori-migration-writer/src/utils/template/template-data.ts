// CLASSIFICATION: [OPEN]
import { get } from 'lodash';
import type { Data } from 'ejs';
import type { TemplateProperties } from '../../types.js';

/**
 * Resolve template data from properties
 *
 * If the template properties specify a nested data key, extracts that portion
 * of the template data. Otherwise returns the full data object.
 *
 * @param templateData - Full template data object
 * @param templateProps - Template properties that may contain a data key
 * @returns Resolved template data for rendering
 */
export function resolveTemplateData(templateData: Data, templateProps: TemplateProperties): Data {
    if (!templateProps.templateDataKey) {
        return templateData;
    }

    try {
        return get(templateData, templateProps.templateDataKey as string);
    } catch {
        // If extraction fails, return empty object to allow template rendering to continue
        return {};
    }
}
