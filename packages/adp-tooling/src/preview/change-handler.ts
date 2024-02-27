import type { Editor } from 'mem-fs-editor';
import { TemplateFileName } from '../types';
import type { AddXMLChange, CommonChangeProperties, CodeExtChange } from '../types';
import { join } from 'path';
import type { Logger } from '@sap-ux/logger';

/**
 * Map of change type specific correction functions.
 */
export const moduleNameContentMap: { [key: string]: (change: CommonChangeProperties) => string } = {
    codeExt: (change) => ((change as CodeExtChange).content?.codeRef ?? '').replace('.js', ''),
    addXML: (change) => (change as AddXMLChange).content?.fragmentPath ?? ''
} as const;

/**
 * Sets the moduleName property of the provided change to also support old changes with newer UI5 versions.
 *
 * @param change change to be fixed
 * @param logger logger instance
 */

/**
 * Fix existing old changes by setting the moduleName property when being read.
 *
 * @param change - the change to be fixed
 * @param logger - the logger instance
 */
export function tryFixChange(change: CommonChangeProperties, logger: Logger) {
    try {
        const prefix = change.reference.replace(/\./g, '/');
        change.moduleName = `${prefix}/changes/${moduleNameContentMap[change.changeType](change)}`;
    } catch (error) {
        logger.warn('Could not fix missing module name.');
    }
}

/**
 * Checks if the change is of type AddXMLChange.
 *
 * @param change - the change to be checked
 * @returns true if the change is of type AddXMLChange
 */
export function isAddXMLChange(change: CommonChangeProperties): change is AddXMLChange {
    return change.changeType === 'addXML';
}

/**
 * Adds an XML fragment to the file system.
 *
 * @param basePath - the base path of the project
 * @param change - the change containing the fragment path
 * @param fs - the mem-fs editor
 * @param logger - the logger instance
 */
export function addXmlFragment(basePath: string, change: AddXMLChange, fs: Editor, logger: Logger) {
    const fragmentTemplatePath = join(__dirname, '../../templates/rta', TemplateFileName.Fragment);
    fs.copy(fragmentTemplatePath, join(basePath, 'changes', change.content.fragmentPath));
    logger.info(`XML Fragment "${change.content.fragmentPath}" was created`);
}
