import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import type { Logger } from '@sap-ux/logger';

import { getWebappPath } from '@sap-ux/project-access';
import { createPropertiesI18nEntries } from '@sap-ux/i18n';
import type { NewI18nEntry, SapTextType } from '@sap-ux/i18n';

import type { CommonChangeProperties } from '../types.js';

interface ChangeText {
    value?: unknown;
    type?: string;
}

/**
 * Determines whether a change carries translatable text that must be bound against the
 * `@i18n` model. The change type is intentionally not inspected: change types are owned by
 * the individual control change handlers, not by us, and any of them may carry a `texts`
 * section — so the presence of a non-empty `texts` object is the reliable signal.
 *
 * @param {CommonChangeProperties} change - The change to inspect.
 * @returns {boolean} `true` if the change has a non-empty `texts` section.
 */
export function hasTranslatableText(change: CommonChangeProperties): boolean {
    const texts = change.texts as Record<string, ChangeText> | undefined;
    return !!texts && typeof texts === 'object' && Object.keys(texts).length > 0;
}

/**
 * Processes the translatable text of a change authored in the adaptation editor so it
 * resolves against the `@i18n` model:
 *
 * For each entry in the change's top-level `texts`:
 * - values already bound to `{@i18n>...}` are left untouched;
 * - legacy `{i18n>KEY}` bindings are re-pointed to `{@i18n>KEY}` in place (no re-extraction);
 * - literal strings are extracted into `webapp/i18n/i18n.properties` under the collision-safe
 *   key `<fileName>_<textId>`, and the value is replaced with `{@i18n>KEY}`.
 *
 * The `@i18n` model registration itself is handled once at editor startup (see
 * `initAdp` in preview-middleware) and by the generator scaffold — not per change — so this
 * function only rewrites bindings and writes translations. The `change` object is mutated in
 * place so the caller persists the rewritten bindings; `fs` is committed by the caller.
 *
 * @param projectRoot - The adaptation project root path.
 * @param change - The change being written (mutated in place).
 * @param fs - The `mem-fs-editor` instance shared with the change writer.
 * @param logger - Logger instance.
 * @returns {Promise<boolean>} `true` if any text binding was rewritten.
 */
export async function processChangeTextsI18n(
    projectRoot: string,
    change: CommonChangeProperties,
    fs: Editor,
    logger: Logger
): Promise<boolean> {
    const texts = change.texts as Record<string, ChangeText> | undefined;
    if (!texts || typeof texts !== 'object') {
        return false;
    }

    const entries: NewI18nEntry[] = [];
    let modified = false;

    for (const textId of Object.keys(texts)) {
        const entry = texts[textId];
        if (!entry || typeof entry.value !== 'string') {
            continue;
        }

        // Already an @i18n binding — nothing to do.
        if (/^\{@i18n>[^}]+\}$/.test(entry.value)) {
            continue;
        }

        // Legacy {i18n>KEY} — re-point to @i18n without re-extracting the text.
        const legacy = /^\{i18n>([^}]+)\}$/.exec(entry.value);
        if (legacy) {
            entry.value = `{@i18n>${legacy[1]}}`;
            modified = true;
            continue;
        }

        const key = `${change.fileName}_${textId}`;
        entries.push({
            key,
            value: entry.value,
            ...(entry.type ? { annotation: { textType: entry.type as SapTextType } } : {})
        });
        entry.value = `{@i18n>${key}}`;
        modified = true;
    }

    if (entries.length > 0) {
        const webappPath = await getWebappPath(projectRoot, fs);
        const i18nFilePath = join(webappPath, 'i18n', 'i18n.properties');
        await createPropertiesI18nEntries(i18nFilePath, entries, undefined, fs);
        logger.debug(`Extracted ${entries.length} text(s) into ${i18nFilePath}`);
    }

    return modified;
}
