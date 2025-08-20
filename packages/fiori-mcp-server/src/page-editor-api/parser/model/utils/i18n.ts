import type { I18nBundle } from '@sap-ux/i18n';
import type { ProjectType } from '@sap-ux/project-access';
import type { TranslationBundles, TranslationBundleKeys } from '../types';
import { TRANSLATION_BUNDLE_ANNOTATION, TRANSLATION_BUNDLE_SERVICE, TRANSLATION_BUNDLE_UI5 } from '../types';
import type { ObjectAggregation } from '../ObjectAggregation';

const I18N_BINDING_PREFIX = 'i18n';

/**
 * Method extracts i18n binding and returns key of i18n entry.
 *
 * @param input - Binding value.
 * @param resolveAnnotationBinding - Check if method should resolve syntax annotation based i18n binding.
 * @param forceKeyExtraction - Optional parameter to force key extraction in case of {{key}} format.
 * @returns I18n entry key or undefined if input does not matches i18n binding pattern.
 */
export const extractI18nKey = (
    input = '',
    resolveAnnotationBinding = false,
    forceKeyExtraction?: boolean
): string | undefined => {
    if (new RegExp(`^{{[^\\{}:]+}}$`).exec(input)) {
        if (!resolveAnnotationBinding || forceKeyExtraction) {
            return input.toString().substring(2, input.length - 2);
        }
    }
    const prefixRegex = resolveAnnotationBinding
        ? `(${I18N_BINDING_PREFIX}|@${I18N_BINDING_PREFIX})`
        : `${I18N_BINDING_PREFIX}`;
    const mathIndex = resolveAnnotationBinding ? 2 : 1;
    const i18nMatch = new RegExp(`^{${prefixRegex}>([^\\{}:]+)}$`).exec(input);
    return i18nMatch ? i18nMatch[mathIndex] : undefined;
};

/**
 * Method to resolve passed i18n binding value into value from i18n bundle.
 *
 * @param value Binding value like `{i18n>key}`.
 * @param i18nBundle I18n bundle data.
 * @returns Resolved value from i18n bundle.
 */
export const resolveI18nValue = (value: string, i18nBundle: I18nBundle = {}): string | undefined => {
    const key = extractI18nKey(value, true, true);
    if (key) {
        const entries = i18nBundle[key];
        if (entries?.length > 0) {
            return entries[0].value?.value;
        }
    }
};

/**
 * Method returns name of i18n bundle depending on passed project type and entity.
 *
 * @param isCustom Is custom extension.
 * @param isViewNode Is visible node.
 * @param isAnnotation Node has mapping to annotation.
 * @param projectType Project type.
 * @returns I18n bundle name.
 */
export const getI18nBundleName = (
    isCustom?: boolean,
    isViewNode?: boolean,
    isAnnotation?: boolean,
    projectType: ProjectType = 'EDMXBackend'
): TranslationBundleKeys => {
    if (['CAPJava', 'CAPNodejs'].includes(projectType) && !isCustom && isViewNode) {
        // CAP project - for non custom view nodes like fields, sections, columns we need use translation from service bundle
        return TRANSLATION_BUNDLE_SERVICE;
    }
    if (isAnnotation) {
        return TRANSLATION_BUNDLE_ANNOTATION;
    }
    return TRANSLATION_BUNDLE_UI5;
};

export const getRelevantI18nBundle = (
    aggregation: ObjectAggregation,
    bundle?: TranslationBundles,
    projectType?: ProjectType
): I18nBundle | undefined => {
    return bundle
        ? bundle[
              getI18nBundleName(aggregation.custom, aggregation.isViewNode, !!aggregation.annotationNodeId, projectType)
          ]
        : {};
};
