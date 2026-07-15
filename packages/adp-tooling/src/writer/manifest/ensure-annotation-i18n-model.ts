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
 * bindings (`{@i18n>KEY}`) resolve against, without ever producing a duplicate.
 *
 * This is the single source of truth for `@i18n` registration:
 * - If an `appdescr_ui5_addNewModelEnhanceWith` for `@i18n` already exists (the base app
 *   declares that resource model, or a prior run added it), the existing entry is enhanced
 *   with `createIfMissing: true` instead of adding a second one — a duplicate `@i18n`
 *   registration is rejected by the descriptor merger.
 * - Otherwise a fresh entry is appended.
 *
 * The generator scaffold (`getManifestContent`) calls this directly on the in-memory
 * content it builds; the disk-based `ensureAnnotationI18nModelRegistered` delegates here
 * after reading the descriptor.
 *
 * Mutates in place: when an existing `@i18n` entry is enhanced, its nested `content`
 * object is modified directly (not just the array). Callers reusing the same `Content[]`
 * (or a shared change object within it) will observe the added `createIfMissing` flag.
 *
 * @param {Content[]} content - The descriptor content array to inspect and, if needed, extend or mutate in place.
 * @returns {boolean} `true` if the content was modified, `false` if it was already correct.
 */
export function ensureAnnotationI18nModelContent(content: Content[]): boolean {
    const existing = content.find(
        (change) =>
            change.changeType === 'appdescr_ui5_addNewModelEnhanceWith' &&
            (change.content as { modelId?: string }).modelId === ANNOTATION_I18N_MODEL_ID
    );

    if (existing) {
        const modelContent = existing.content as { createIfMissing?: boolean };
        if (modelContent.createIfMissing === true) {
            return false;
        }
        modelContent.createIfMissing = true;
        return true;
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
 * delegates the enhance-vs-add decision to that single source of truth, and writes the
 * descriptor back only if it changed. Used for projects that predate the generator scaffold
 * and for the key-user take-over path.
 *
 * No-op when the descriptor is missing/unreadable or the `@i18n` entry is already correct.
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
