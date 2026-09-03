import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join, dirname } from 'node:path';
import type { Fragment } from './types.js';
import { validateBasePath, validateRelativePath } from '../common/validate.js';
import { getDefaultFragmentContent } from '../common/defaults.js';
import { copyTpl, createIdGenerator } from '../common/file.js';
import { getTemplatePath } from '../templates.js';
import { getManifest } from '../common/utils.js';

/**
 * Generate a standalone fragment file with default content.
 * Does NOT modify manifest.json - fragment-only generation.
 *
 * @param {string} basePath - the base path
 * @param {Fragment} fragment - fragment generation configuration
 * @param {Editor} [fs] - the mem-fs editor instance
 * @returns {Promise<Editor>} the updated mem-fs editor instance
 * @throws {Error} if the project folder is invalid or manifest.json cannot be found
 * @throws {Error} if sap.fe.templates is missing from manifest.json dependencies (only FPM projects are supported)
 * @throws {Error} if fragment.folder is an absolute path or contains path traversal sequences (..)
 * @throws {Error} if fragment.name is an absolute path or contains path traversal sequences (..)
 */
export async function generateFragment(basePath: string, fragment: Fragment, fs?: Editor): Promise<Editor> {
    fs ??= create(createStorage());
    await validateBasePath(basePath, fs);
    const fnGenerateId = await createIdGenerator({ basePath, fsEditor: fs });

    const { path: manifestPath } = await getManifest(basePath, fs);

    // Calculate path for fragment with validation
    const folder = fragment.folder ?? 'ext/fragment';
    validateRelativePath(folder, 'Fragment folder');
    validateRelativePath(fragment.name, 'Fragment name');
    const path = join(dirname(manifestPath), folder);

    // Generate default content if not provided
    const content = fragment.content ?? getDefaultFragmentContent('Sample Text', fnGenerateId);

    // Create fragment file
    const viewPath = join(path, `${fragment.name}.fragment.xml`);
    if (!fs.exists(viewPath)) {
        copyTpl(fs, getTemplatePath('common/Fragment.xml'), viewPath, { content }, fnGenerateId);
    }

    return fs;
}
