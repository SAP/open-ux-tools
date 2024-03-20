import type { Editor } from 'mem-fs-editor';
import { TemplateFileName, FolderTypes } from '../types';
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
    return change.changeType === 'addXML' || change.changeType === 'addXMLAtExtensionPoint';
}

/**
 * Asynchronously adds an XML fragment to the project if it doesn't already exist.
 *
 * @param {string} basePath - The base path of the project.
 * @param {AddXMLChange} change - The change data, including the fragment path.
 * @param {Editor} fs - The mem-fs-editor instance.
 * @param {Logger} logger - The logging instance.
 */
export function addXmlFragment(basePath: string, change: AddXMLChange, fs: Editor, logger: Logger): void {
    const { fragmentPath } = change.content;
    const fullPath = join(basePath, FolderTypes.CHANGES, fragmentPath);

    try {
        if (fs.exists(fullPath)) {
            logger.info(`XML Fragment "${fragmentPath}" already exists.`);
            return;
        }

        const fragmentTemplatePath = join(__dirname, '../../templates/rta', TemplateFileName.Fragment);
        fs.copy(fragmentTemplatePath, fullPath);
        logger.info(`XML Fragment "${fragmentPath}" was created`);
    } catch (error) {
        logger.error(`Failed to create XML Fragment "${fragmentPath}": ${error}`);
    }
}
