import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { coerce, lt } from 'semver';

/**
 * Validate that the UI5 version requirement is valid.
 *
 * @param ui5Version - optional minimum required UI5 version
 * @returns true if the version is supported otherwise throws an error
 */
export function validateVersion(ui5Version?: string): boolean {
    const minVersion = coerce(ui5Version);
    if (minVersion && lt(minVersion, '1.84.0')) {
        throw new Error('SAP Fiori elements for OData v4 is only supported starting with SAPUI5 1.84.');
    }
    return true;
}

/**
 * Validates the provided base path, checks at least one of expected dependencies is present.
 *
 * @param {string} basePath - the base path
 * @param {Editor} fs - the memfs editor instance
 * @param {string[]} dependencies - expected dependencies
 * @returns true if the path is valid, otherwise, throws and error
 */
export function validateBasePath(basePath: string, fs?: Editor, dependencies = ['sap.fe.templates']): boolean {
    if (!fs) {
        fs = create(createStorage());
    }

    const manifestPath = join(basePath, 'webapp', 'manifest.json');
    if (!fs.exists(manifestPath)) {
        throw new Error(`Invalid project folder. Cannot find required file ${manifestPath}`);
    } else {
        const manifest = fs.readJSON(manifestPath) as any;
        const libs = manifest['sap.ui5']?.dependencies?.libs;
        const valid = dependencies.length
            ? dependencies.some((dependency) => {
                  return libs?.[dependency] !== undefined;
              })
            : true;
        if (!valid) {
            if (dependencies.length === 1) {
                throw new Error(
                    `Dependency ${dependencies[0]} is missing in the manifest.json. Fiori elements FPM requires the SAP FE libraries.`
                );
            } else {
                throw new Error(
                    `All of the dependencies ${dependencies.join(
                        ', '
                    )} are missing in the manifest.json. Fiori elements FPM requires the SAP FE libraries.`
                );
            }
        }
    }

    return true;
}

/**
 * Returns the message property if the error is an instance of `Error` else a string representation of the error.
 *
 * @param error {Error | unknown} - the error instance
 * @returns {string} the error message
 */
export function getErrorMessage(error: Error | unknown): string {
    return error instanceof Error ? error.message : String(error);
}
