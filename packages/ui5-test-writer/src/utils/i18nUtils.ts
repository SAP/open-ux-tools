/**
 * Resolves an action/menu label that may be an i18n placeholder (`{i18n>key}` or `{{key}}`) to its
 * translated text. `unresolved` is true when a placeholder had no matching key in the app i18n bundle,
 * so the writer can emit a `// TODO` comment for the developer.
 */
export type I18nLabelResolver = (label: string | undefined) => { label: string; unresolved: boolean };

// Minimal structural shape of the `@sap-ux/project-access` I18nBundles result (its type is not re-exported).
interface I18nEntryLike {
    value?: { value?: string };
}
type I18nBundleLike = Record<string, I18nEntryLike[]>;
interface I18nBundlesLike {
    'sap.app'?: I18nBundleLike;
    models?: Record<string, I18nBundleLike>;
    service?: I18nBundleLike;
}

/**
 * Passes labels through unchanged. Used when the app i18n bundle is unavailable.
 *
 * @param label - the raw label
 * @returns the label untouched, never flagged as unresolved
 */
export const passthroughLabelResolver: I18nLabelResolver = (label) => ({ label: label ?? '', unresolved: false });

/**
 * Builds a label resolver over the app i18n bundles. All model bundles and the `sap.app` bundle are
 * merged into a single key→text lookup (the `{i18n>…}` model name is not reliably known at this layer).
 *
 * @param bundles - i18n bundles from `ApplicationAccess.getI18nBundles()`
 * @returns a resolver that replaces `{i18n>key}` / `{{key}}` placeholders with their translated text
 */
export function buildI18nLabelResolver(bundles: I18nBundlesLike): I18nLabelResolver {
    const lookup = new Map<string, string>();
    const addBundle = (bundle?: I18nBundleLike): void => {
        for (const key of Object.keys(bundle ?? {})) {
            const text = bundle?.[key]?.[0]?.value?.value;
            if (text !== undefined && !lookup.has(key)) {
                lookup.set(key, text);
            }
        }
    };
    addBundle(bundles['sap.app']);
    for (const modelKey of Object.keys(bundles.models ?? {})) {
        addBundle(bundles.models?.[modelKey]);
    }

    return (label) => {
        const raw = (label ?? '').trim();
        const match = /^\{i18n>(.+)\}$/.exec(raw) ?? /^\{\{(.+)\}\}$/.exec(raw);
        if (!match?.[1]) {
            return { label: label ?? '', unresolved: false };
        }
        const resolved = lookup.get(match[1]);
        return resolved !== undefined
            ? { label: resolved, unresolved: false }
            : { label: label ?? '', unresolved: true };
    };
}
