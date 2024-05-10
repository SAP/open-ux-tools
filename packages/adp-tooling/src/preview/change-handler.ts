import type { Editor } from 'mem-fs-editor';
import { TemplateFileName } from '../types';
import type { AddXMLChange, CommonChangeProperties, CodeExtChange } from '../types';
import { join } from 'path';
import { DirName } from '@sap-ux/project-access';
import type { Logger } from '@sap-ux/logger';

/**
 * A mapping object that defines how to extract change content data from changes based on their type.
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
 * Attempts to fix a change object by setting its moduleName based on its reference and changeType
 * to also support old changes with newer UI5 versions.
 *
 * @param {CommonChangeProperties} change - The change object to be fixed.
 * @param {Logger} logger - An instance for logging warnings, errors, or informational messages.
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
 * Determines whether a given change is of type `AddXMLChange`.
 *
 * @param {CommonChangeProperties} change - The change object to check.
 * @returns {boolean} `true` if the `changeType` is either 'addXML' or 'addXMLAtExtensionPoint',
 *          indicating the change is of type `AddXMLChange`.
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
    const fullPath = join(basePath, DirName.Changes, fragmentPath);

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
