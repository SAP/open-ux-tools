import path from 'node:path';
import type { Editor } from 'mem-fs-editor';

import { getWebappPath } from '@sap-ux/project-access';

import type { Content } from '../../types.js';

/**
 * Model ID used by the UI5 annotation processor to resolve `{@i18n>...}` bindings
 * inside annotation changes. See annotation-based key-user change support.
 */
const ANNOTATION_I18N_MODEL_ID = '@i18n';

/**
 * Bundle backing the `@i18n` model. Reuses the project's main i18n file — a single
 * `.properties` file may back both the `i18n` and `@i18n` model IDs.
 */
const ANNOTATION_I18N_BUNDLE = 'i18n/i18n.properties';

interface AppDescriptorVariant {
    content?: Content[];
}

/**
 * Ensures a descriptor content array registers the `@i18n` model that annotation-change
 * bindings resolve against, without ever producing a duplicate.
 *
 * If an `appdescr_ui5_addNewModelEnhanceWith` for `@i18n` already exists, it is left
 * untouched (a duplicate is rejected by the merger, and the existing entry already resolves
 * the bindings). Otherwise a fresh entry with `createIfMissing: true` is appended.
 *
 * `createIfMissing` is set only on an entry we add — never grafted onto a pre-existing one,
 * since that would force the merger enhancement to be downported to every supported release.
 *
 * @param {Content[]} content - The descriptor content array to inspect and, if needed, extend.
 * @returns {boolean} `true` if a fresh `@i18n` entry was appended, `false` if one already existed.
 */
export function ensureAnnotationI18nModelContent(content: Content[]): boolean {
    const existing = content.some(
        (change) =>
            change.changeType === 'appdescr_ui5_addNewModelEnhanceWith' &&
            (change.content as { modelId?: string }).modelId === ANNOTATION_I18N_MODEL_ID
    );

    if (existing) {
        return false;
    }

    content.push({
        changeType: 'appdescr_ui5_addNewModelEnhanceWith',
        content: {
            modelId: ANNOTATION_I18N_MODEL_ID,
            createIfMissing: true
        },
        texts: {
            i18n: ANNOTATION_I18N_BUNDLE
        }
    });
    return true;
}

/**
 * Ensures a project's `manifest.appdescr_variant` on disk registers the `@i18n` model.
 *
 * Disk-based wrapper around {@link ensureAnnotationI18nModelContent}: reads the descriptor,
 * delegates the add-if-missing decision to that single source of truth, and writes the
 * descriptor back only if a fresh entry was appended. Used for projects that predate the
 * generator scaffold and for the key-user take-over path.
 *
 * No-op when the descriptor is missing/unreadable or the `@i18n` entry already exists.
 *
 * @param projectPath - The root path of the adaptation project.
 * @param fs - The `mem-fs-editor` instance used for file operations.
 * @returns {Promise<boolean>} `true` if the descriptor was modified, otherwise `false`.
 */
export async function ensureAnnotationI18nModelRegistered(projectPath: string, fs: Editor): Promise<boolean> {
    const webappPath = await getWebappPath(projectPath, fs);
    const descriptorPath = path.join(webappPath, 'manifest.appdescr_variant');

    // mem-fs-editor's readJSON returns null (not undefined) for a missing file.
    const descriptor = fs.readJSON(descriptorPath) as AppDescriptorVariant | null;
    if (!descriptor || !Array.isArray(descriptor.content)) {
        return false;
    }

    const modified = ensureAnnotationI18nModelContent(descriptor.content);
    if (modified) {
        fs.writeJSON(descriptorPath, descriptor);
    }
    return modified;
}
