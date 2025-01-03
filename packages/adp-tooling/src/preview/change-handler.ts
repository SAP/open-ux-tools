import type { Editor } from 'mem-fs-editor';
import type { AddXMLChange, CommonChangeProperties, CodeExtChange } from '../types';
import { join } from 'path';
import { DirName } from '@sap-ux/project-access';
import type { Logger } from '@sap-ux/logger';
import { render } from 'ejs';
import { randomBytes } from 'crypto';

const OBJECT_PAGE_CUSTOM_SECTION = 'OBJECT_PAGE_CUSTOM_SECTION';
const CUSTOM_ACTION = 'CUSTOM_ACTION';
const OBJECT_PAGE_HEADER_FIELD = 'OBJECT_PAGE_HEADER_FIELD';
const V2_SMART_TABLE_COLUMN = 'V2_SMART_TABLE_COLUMN';
const V2_SMART_TABLE_CELL = 'V2_SMART_TABLE_CELL';
const V4_MDC_TABLE_COLUMN = 'V4_MDC_TABLE_COLUMN';
const ANALYTICAL_TABLE_COLUMN = 'ANALYTICAL_TABLE_COLUMN';
const TABLE_ACTION = 'TABLE_ACTION';

interface FragmentTemplateConfig<T = { [key: string]: any }> {
    /**
     * Relative path to ../../templates/rta, includes template file name
     */
    path: string;
    getData: (change: AddXMLChange) => T;
}

const fragmentTemplateDefinitions: Record<string, FragmentTemplateConfig> = {
    [OBJECT_PAGE_CUSTOM_SECTION]: {
        path: 'common/op-custom-section.xml',
        getData: () => {
            const uuid = randomBytes(4).toString('hex');
            return {
                ids: {
                    objectPageSection: `op-section-${uuid}`,
                    objectPageSubSection: `op-subsection-${uuid}`,
                    hBox: `hbox-${uuid}`
                }
            };
        }
    },
    [CUSTOM_ACTION]: {
        path: 'common/custom-action.xml',
        getData: () => {
            const uuid = randomBytes(4).toString('hex');
            return {
                ids: {
                    toolbarActionButton: `btn-${uuid}`
                }
            };
        }
    },
    [TABLE_ACTION]: {
        path: 'common/v4-table-action.xml',
        getData: () => {
            const uuid = randomBytes(4).toString('hex');
            return {
                ids: {
                    customToolbarAction: `toolbarAction-${uuid}`,
                    customActionButton: `btn-${uuid}`
                }
            };
        }
    },
    [OBJECT_PAGE_HEADER_FIELD]: {
        path: 'common/header-field.xml',
        getData: () => {
            const uuid = randomBytes(4).toString('hex');
            return {
                ids: {
                    vBoxContainer: `vBox-${uuid}`,
                    label: `label-${uuid}`
                }
            };
        }
    },
    [V2_SMART_TABLE_COLUMN]: {
        path: 'v2/m-table-custom-column.xml',
        getData: () => {
            const uuid = randomBytes(4).toString('hex');
            return {
                ids: {
                    column: `column-${uuid}`,
                    columnTitle: `column-title-${uuid}`
                }
            };
        }
    },
    [V2_SMART_TABLE_CELL]: {
        path: 'v2/m-table-custom-column-cell.xml',
        getData: () => {
            const uuid = randomBytes(4).toString('hex');
            return {
                ids: {
                    text: `cell-text-${uuid}`
                }
            };
        }
    },
    [V4_MDC_TABLE_COLUMN]: {
        path: 'v4/mdc-custom-column.xml',
        getData: () => {
            const uuid = randomBytes(4).toString('hex');
            return {
                ids: {
                    column: `column-${uuid}`,
                    text: `text-${uuid}`
                }
            };
        }
    },
    [ANALYTICAL_TABLE_COLUMN]: {
        path: 'common/analytical-custom-column.xml',
        getData: (change: AddXMLChange) => {
            const uuid = randomBytes(4).toString('hex');
            const columnIndex = change.content.index;
            return {
                ids: {
                    column: `column-${uuid}`,
                    label: `label-${uuid}`,
                    text: `text-${uuid}`,
                    customData: `custom-data-${uuid}`,
                    index: columnIndex.toFixed(0)
                }
            };
        }
    }
};

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
    const templateConfig = fragmentTemplateDefinitions[change.content?.templateName ?? ''];
    try {
        if (templateConfig) {
            const fragmentTemplatePath = join(__dirname, '../../templates/rta', templateConfig.path);
            const text = fs.read(fragmentTemplatePath);
            const template = render(text, templateConfig.getData(change));
            fs.write(fullPath, template);
        } else {
            // copy default fragment template
            const templateName = 'fragment.xml'; /* TemplateFileName.Fragment */
            const fragmentTemplatePath = join(__dirname, '../../templates/rta', templateName);
            fs.copy(fragmentTemplatePath, fullPath);
        }
        logger.info(`XML Fragment "${fragmentPath}" was created`);
    } catch (error) {
        logger.error(`Failed to create XML Fragment "${fragmentPath}": ${error}`);
    }
}
