import type { Editor } from 'mem-fs-editor';
import type {
    AddXMLChange,
    CommonChangeProperties,
    CodeExtChange,
    AnnotationFileChange,
    CommonAdditionalChangeInfoProperties,
    AppDescriptorV4Change
} from '../types';
import { ChangeType, TemplateFileName } from '../types';
import { basename, join } from 'node:path';
import type { Logger, ToolsLogger } from '@sap-ux/logger';
import { render } from 'ejs';
import { randomBytes } from 'node:crypto';
import { ManifestService } from '../base/abap/manifest-service';
import { getVariant, isTypescriptSupported } from '../base/helper';
import { getAnnotationNamespaces } from '@sap-ux/odata-service-writer';
import { generateChange } from '../writer/editors';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { DirName } from '@sap-ux/project-access';

const OBJECT_PAGE_CUSTOM_SECTION = 'OBJECT_PAGE_CUSTOM_SECTION';
const CUSTOM_ACTION = 'CUSTOM_ACTION';
const OBJECT_PAGE_HEADER_FIELD = 'OBJECT_PAGE_HEADER_FIELD';
const V2_SMART_TABLE_COLUMN = 'V2_SMART_TABLE_COLUMN';
const V2_SMART_TABLE_CELL = 'V2_SMART_TABLE_CELL';
const V4_MDC_TABLE_COLUMN = 'V4_MDC_TABLE_COLUMN';
const ANALYTICAL_TABLE_COLUMN = 'ANALYTICAL_TABLE_COLUMN';
const GRID_TREE_TABLE_COLUMN = 'GRID_TREE_TABLE_COLUMN';
const TABLE_ACTION = 'TABLE_ACTION';

interface FragmentTemplateConfig<T = { [key: string]: any }> {
    /**
     * Relative path to ../../templates/rta, includes template file name
     */
    path: string;
    getData: (change: AddXMLChange) => T;
}

export const fragmentTemplateDefinitions: Record<string, FragmentTemplateConfig> = {
    [OBJECT_PAGE_CUSTOM_SECTION]: {
        path: 'common/op-custom-section.xml',
        getData: (): { ids: Record<string, string> } => {
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
        getData: (change: AddXMLChange) => {
            const uuid = randomBytes(4).toString('hex');
            const columnIndex = change.content.index;
            return {
                ids: {
                    column: `column-${uuid}`,
                    columnTitle: `column-title-${uuid}`,
                    customData: `custom-data-${uuid}`,
                    index: columnIndex.toFixed(0)
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
    [GRID_TREE_TABLE_COLUMN]: {
        path: 'common/grid-tree-custom-column.xml',
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
 * Determines whether a given change is of type `codeExt`.
 *
 * @param {CommonChangeProperties} change - The change object to check.
 * @returns {boolean} `true` if the `changeType` is `codeExt`, indicating the change is of type `codeExtChange`.
 */
export function isCodeExtChange(change: CommonChangeProperties): change is CodeExtChange {
    return change.changeType === 'codeExt';
}

/**
 * Determines whether a given change is of type `AnnotationFileChange`.
 *
 * @param {CommonChangeProperties} change - The change object to check.
 * @returns {boolean} `true` if the `changeType` is either 'appdescr_app_addAnnotationsToOData',
 *          indicating the change is of type `AnnotationFileChange`.
 */
export function isAddAnnotationChange(change: CommonChangeProperties): change is AnnotationFileChange {
    return change.changeType === 'appdescr_app_addAnnotationsToOData';
}

/**
 * Determines whether a given change is of type `V4 Descriptor Change`.
 *
 * @param {CommonChangeProperties} change - The change object to check.
 * @returns {boolean} `true` if the `changeType` is either 'appdescr_fe_changePageConfiguration',
 *          indicating the change is of type `V4 Descriptor Change`.
 */
export function isV4DescriptorChange(change: CommonChangeProperties): change is AppDescriptorV4Change {
    return change.changeType === 'appdescr_fe_changePageConfiguration';
}

/**
 * Asynchronously adds an XML fragment to the project if it doesn't already exist.
 *
 * @param {string} basePath - The base path of the project.
 * @param {AddXMLChange} change - The change data, including the fragment path.
 * @param {Editor} fs - The mem-fs-editor instance.
 * @param {Logger} logger - The logging instance.
 * @param {CommonAdditionalChangeInfoProperties} additionalChangeInfo - Optional extended change properties.
 */
export function addXmlFragment(
    basePath: string,
    change: AddXMLChange,
    fs: Editor,
    logger: Logger,
    additionalChangeInfo?: CommonAdditionalChangeInfoProperties
): void {
    const { fragmentPath } = change.content;
    const fullPath = join(basePath, DirName.Changes, fragmentPath);
    const templateConfig = fragmentTemplateDefinitions[additionalChangeInfo?.templateName ?? ''];
    try {
        if (templateConfig) {
            const fragmentTemplatePath = join(__dirname, '../../templates/rta', templateConfig.path);
            const text = fs.read(fragmentTemplatePath);
            const changeTemplate = {
                ...templateConfig.getData(change),
                viewName: additionalChangeInfo?.viewName,
                targetAggregation: additionalChangeInfo?.targetAggregation,
                controlType: additionalChangeInfo?.controlType
            };
            const template = render(text, changeTemplate);
            fs.write(fullPath, template);
        } else {
            // use default fragment template
            const templateName = 'fragment.xml'; /* TemplateFileName.Fragment */
            const fragmentTemplatePath = join(__dirname, '../../templates/rta', templateName);
            const text = fs.read(fragmentTemplatePath);
            const template = render(text, {
                viewName: additionalChangeInfo?.viewName,
                targetAggregation: additionalChangeInfo?.targetAggregation,
                controlType: additionalChangeInfo?.controlType
            });
            fs.write(fullPath, template);
        }
        logger.info(`XML Fragment "${fragmentPath}" was created`);
    } catch (error) {
        logger.error(`Failed to create XML Fragment "${fragmentPath}": ${error}`);
    }
}

/**
 * Asynchronously adds an controller extension to the project if it doesn't already exist.
 *
 * @param {string} rootPath - The root path of the project.
 * @param {string} basePath - The base path of the project.
 * @param {CodeExtChange} change - The change data, including the fragment path.
 * @param {Editor} fs - The mem-fs-editor instance.
 * @param {Logger} logger - The logging instance.
 */
export async function addControllerExtension(
    rootPath: string,
    basePath: string,
    change: CodeExtChange,
    fs: Editor,
    logger: Logger
): Promise<void> {
    const { codeRef } = change.content;
    const isTsSupported = isTypescriptSupported(rootPath, fs);
    const fileName = basename(codeRef, '.js');
    const fullName = `${fileName}.${isTsSupported ? 'ts' : 'js'}`;
    const tmplFileName = isTsSupported ? TemplateFileName.TSController : TemplateFileName.Controller;
    const tmplPath = join(__dirname, '../../templates/rta', tmplFileName);
    try {
        const text = fs.read(tmplPath);
        const id = (await getVariant(rootPath))?.id;
        const extensionPath = `${id}.${fileName}`;
        const templateData = isTsSupported ? { name: fileName, ns: id } : { extensionPath };

        const template = render(text, templateData);
        fs.write(join(basePath, DirName.Changes, DirName.Coding, fullName), template);
    } catch (error) {
        logger.error(`Failed to create controller extension "${codeRef}": ${error}`);
        throw new Error(`Failed to create controller extension: ${error.message}`);
    }
}

/**
 * Asynchronously adds an XML fragment to the project if it doesn't already exist.
 *
 * @param {string} webappPath - The path to the webapp of the project.
 * @param {string} projectRoot - The root path of the project.
 * @param {AnnotationFileChange} change - The change data, including the fragment path.
 * @param {Editor} fs - The mem-fs-editor instance.
 * @param {Logger} logger - The logging instance.
 *@param {AbapServiceProvider} provider - abap provider.
 */
export async function addAnnotationFile(
    webappPath: string,
    projectRoot: string,
    change: AnnotationFileChange,
    fs: Editor,
    logger: Logger,
    provider: AbapServiceProvider
): Promise<void> {
    const { dataSourceId, annotations, dataSource } = change.content;
    const annotationDataSourceKey = annotations[0];
    const annotationUriSegments = dataSource[annotationDataSourceKey].uri.split('/');
    annotationUriSegments.shift();
    const fullPath = join(webappPath, DirName.Changes, ...annotationUriSegments);
    try {
        const variant = await getVariant(projectRoot);
        const manifestService = await ManifestService.initMergedManifest(
            provider,
            projectRoot,
            variant,
            logger as unknown as ToolsLogger
        );
        const metadata = await manifestService.getDataSourceMetadata(dataSourceId);
        const datasoruces = await manifestService.getManifestDataSources();
        const namespaces = getAnnotationNamespaces({ metadata });
        await generateChange<ChangeType.ADD_ANNOTATIONS_TO_ODATA>(
            projectRoot,
            ChangeType.ADD_ANNOTATIONS_TO_ODATA,
            {
                annotation: {
                    dataSource: dataSourceId,
                    namespaces,
                    serviceUrl: datasoruces[dataSourceId].uri,
                    fileName: basename(dataSource[annotationDataSourceKey].uri)
                },
                variant: await getVariant(projectRoot),
                isCommand: false
            },
            fs
        );
    } catch (error) {
        logger.error(`Failed to create Local Annotation File "${fullPath}": ${error}`);
        throw new Error('Failed to create Local Annotation File' + error.message);
    }
}
