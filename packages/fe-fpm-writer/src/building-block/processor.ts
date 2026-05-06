import { join, posix } from 'node:path';
import * as xpath from 'xpath';
import type { Editor } from 'mem-fs-editor';
import {
    BuildingBlockType,
    type BuildingBlock,
    type CustomColumn,
    type CustomFilterField,
    type CustomFormField,
    type EmbededFragment,
    type RichTextEditorButtonGroups,
    type ButtonGroupConfig,
    type Action,
    type EmbeddedAction
} from './types';
import type { Manifest, InternalCustomElement } from '../common/types';

import { getTemplatePath } from '../templates';
import { applyEventHandlerConfiguration } from '../common/event-handler';
import { getDefaultFragmentContent, setCommonDefaults } from '../common/defaults';
import { getOrAddNamespace } from './prompts/utils/xml';
import { CONFIG } from '../common/file';

/**
 * Type for embedded fragment data used in building block processing.
 */
type EmbeddedFragmentData = InternalCustomElement & EmbededFragment;

/**
 * Type for embedded action data used in building block processing for custom actions.
 */
type EmbeddedActionData = InternalCustomElement & EmbeddedAction;

/**
 * Namespace for XML elements.
 */
interface NamespaceConfig {
    uri: string;
    prefix: string;
}

/**
 * Context for processing building blocks.
 */
interface ProcessingContext {
    fs: Editor;
    xmlDocument?: Document;
    viewPath?: string;
    embeddedFragment?: EmbeddedFragmentData;
    updatedAggregationPath?: string;
    hasAggregation?: boolean;
    embeddedAction?: EmbeddedActionData;
}

/**
 * Configuration for building block templates.
 */
interface BuildingBlockTemplateConfig {
    aggregationConfig: {
        aggregationName: string;
        elementName: string;
    };
    templateFile?: string;
    namespace: NamespaceConfig;
    processor: (buildingBlockData: BuildingBlock, context: ProcessingContext) => void;
}

/**
 * Button group configurations used for validation and providing available button groups.
 */
export const BUTTON_GROUP_CONFIGS: { name: string; buttons: string }[] = [
    { name: 'font-style', buttons: 'bold,italic,underline,strikethrough' },
    { name: 'clipboard', buttons: 'cut,copy,paste' },
    { name: 'structure', buttons: 'bullist,numlist,outdent,indent' },
    { name: 'font', buttons: 'fontfamily,fontsize,forecolor,backcolor' },
    { name: 'undo', buttons: 'undo,redo' },
    { name: 'insert', buttons: 'image,emoticons' },
    { name: 'link', buttons: 'link,unlink' },
    { name: 'text-align', buttons: 'alignleft,aligncenter,alignright,alignjustify' },
    { name: 'table', buttons: 'table' },
    { name: 'styleselect', buttons: 'styleselect' }
];

/**
 * Configuration map for building block types.
 */
export const BUILDING_BLOCK_CONFIG: Partial<Record<BuildingBlockType, BuildingBlockTemplateConfig>> = {
    [BuildingBlockType.CustomColumn]: {
        aggregationConfig: { aggregationName: 'columns', elementName: 'Column' },
        templateFile: 'common/Fragment.xml',
        namespace: { uri: 'sap.fe.macros.table', prefix: 'macrosTable' },
        processor: processCustomColumn
    },
    [BuildingBlockType.CustomFilterField]: {
        aggregationConfig: { aggregationName: 'filterFields', elementName: 'FilterField' },
        templateFile: 'filter/fragment.xml',
        namespace: { uri: 'sap.fe.macros.filterBar', prefix: 'macros' },
        processor: processCustomFilterField
    },
    [BuildingBlockType.CustomFormField]: {
        aggregationConfig: { aggregationName: 'fields', elementName: 'FormElement' },
        templateFile: 'common/Fragment.xml',
        namespace: { uri: 'sap.fe.macros', prefix: 'macros' },
        processor: processCustomFormField
    },
    [BuildingBlockType.RichTextEditorButtonGroups]: {
        aggregationConfig: { aggregationName: 'buttonGroups', elementName: 'ButtonGroup' },
        namespace: { uri: 'sap.fe.macros', prefix: 'macros' },
        processor: processRichTextEditorButtonGroups
    },
    [BuildingBlockType.Action]: {
        aggregationConfig: { aggregationName: 'actions', elementName: 'Action' },
        namespace: { uri: 'sap.fe.macros.table', prefix: 'macrosTable' },
        processor: processAction
    }
};

/**
 * Retrieves the configuration for a building block type.
 *
 * @param buildingBlockType - The building block type
 * @returns The building block configuration (aggregation, namespace, processor)
 * @throws {Error} If configuration not found for the specified type
 */
function getBuildingBlockConfig(buildingBlockType: BuildingBlockType): BuildingBlockTemplateConfig {
    const config = BUILDING_BLOCK_CONFIG[buildingBlockType];
    if (!config) {
        throw new Error(`No configuration found for building block type: ${buildingBlockType}`);
    }
    return config;
}

/**
 * Checks if the building block data matches a specific type.
 *
 * @param {BuildingBlock} data - The building block data to check
 * @param {BuildingBlockType} type - The building block type to check against
 * @returns {boolean} True if the data matches the specified type
 */
function isBuildingBlockType<T extends BuildingBlock>(data: BuildingBlock, type: BuildingBlockType): data is T {
    return data.buildingBlockType === type;
}

/**
 * Processes custom column building block.
 *
 * @param {BuildingBlock} buildingBlockData - The building block data
 * @param {ProcessingContext} context - Processing context
 */
function processCustomColumn(buildingBlockData: BuildingBlock, context: ProcessingContext): void {
    const { fs, viewPath } = context;
    if (!isBuildingBlockType<CustomColumn>(buildingBlockData, BuildingBlockType.CustomColumn)) {
        throw new Error('Expected CustomColumn building block data');
    }

    const config = getBuildingBlockConfig(BuildingBlockType.CustomColumn);
    const columnConfig = buildingBlockData.embededFragment!;
    let processedEventHandler: string | undefined;

    // Apply event handler
    if (columnConfig.eventHandler) {
        processedEventHandler = applyEventHandlerConfiguration(fs, columnConfig, columnConfig.eventHandler, {
            controllerSuffix: false,
            typescript: columnConfig.typescript
        });
        columnConfig.eventHandler = processedEventHandler;
    }

    columnConfig.content = getDefaultFragmentContent(
        'Sample Text',
        buildingBlockData.generateId,
        processedEventHandler
    );
    if (viewPath && !fs.exists(viewPath)) {
        fs.copyTpl(getTemplatePath(config.templateFile), viewPath, columnConfig);
    }
}

/**
 * Processes custom filter field building block.
 *
 * @param {BuildingBlock} buildingBlockData - The building block data
 * @param {ProcessingContext} context - Processing context
 */
function processCustomFilterField(buildingBlockData: BuildingBlock, context: ProcessingContext): void {
    const { fs, viewPath, embeddedFragment } = context;
    if (!isBuildingBlockType<CustomFilterField>(buildingBlockData, BuildingBlockType.CustomFilterField)) {
        throw new Error('Expected CustomFilterField building block data');
    }

    if (!embeddedFragment) {
        throw new Error('EmbeddedFragment is required for CustomFilterField');
    }
    const config = getBuildingBlockConfig(BuildingBlockType.CustomFilterField);

    let filterConfig = {
        label: buildingBlockData.label,
        property: buildingBlockData.property,
        required: buildingBlockData.required ?? false,
        position: buildingBlockData.position!,
        eventHandler: buildingBlockData.embededFragment?.eventHandler,
        ns: embeddedFragment.ns,
        name: embeddedFragment.name,
        path: embeddedFragment.path
    };

    // Apply event handler
    if (filterConfig.eventHandler) {
        filterConfig.eventHandler = applyEventHandlerConfiguration(fs, filterConfig, filterConfig.eventHandler, {
            controllerSuffix: false,
            typescript: buildingBlockData.embededFragment?.typescript,
            templatePath: 'filter/Controller'
        });
    }
    const configKey = config.templateFile;
    const additionalDataConfig = CONFIG[configKey as keyof typeof CONFIG];
    if (additionalDataConfig?.getData) {
        const additionalContext = additionalDataConfig.getData(buildingBlockData.generateId);
        filterConfig = { ...filterConfig, ...additionalContext };
    }

    if (viewPath && !fs.exists(viewPath)) {
        fs.copyTpl(getTemplatePath(config.templateFile), viewPath, filterConfig);
    }
}

/**
 * Processes custom form field building block.
 *
 * @param {BuildingBlock} buildingBlockData - The building block data
 * @param {ProcessingContext} context - Processing context
 */
function processCustomFormField(buildingBlockData: BuildingBlock, context: ProcessingContext): void {
    const { fs, viewPath } = context;
    if (!isBuildingBlockType<CustomFormField>(buildingBlockData, BuildingBlockType.CustomFormField)) {
        throw new Error('Expected CustomFormField building block data');
    }

    if (!buildingBlockData.embededFragment) {
        throw new Error('EmbeddedFragment is required for CustomFormField');
    }

    const config = getBuildingBlockConfig(BuildingBlockType.CustomFormField);
    const formFieldConfig = buildingBlockData.embededFragment;
    let processedEventHandler: string | undefined;

    // Apply event handler
    if (formFieldConfig.eventHandler) {
        processedEventHandler = applyEventHandlerConfiguration(fs, formFieldConfig, formFieldConfig.eventHandler, {
            controllerSuffix: false,
            typescript: formFieldConfig.typescript
        });
        formFieldConfig.eventHandler = processedEventHandler;
    }

    formFieldConfig.content ??= getDefaultFragmentContent(
        'Custom Form Field Content',
        buildingBlockData.generateId,
        processedEventHandler
    );
    if (viewPath && !fs.exists(viewPath)) {
        fs.copyTpl(getTemplatePath(config.templateFile), viewPath, formFieldConfig);
    }
}

/**
 * Extracts a ButtonGroupConfig from an XML element.
 *
 * @param element - The XML element representing a button group.
 * @returns The extracted ButtonGroupConfig, or undefined if required attributes are missing.
 */
function extractButtonGroupConfig(element: Element): ButtonGroupConfig | undefined {
    const name = element.getAttribute('name');
    // extract attributes
    const buttons = element.getAttribute('buttons');
    if (!name || !buttons) {
        return;
    }

    const buttonGroupConfig: ButtonGroupConfig = {
        name,
        buttons
    };

    if (buttons) {
        buttonGroupConfig.buttons = buttons;
    }

    const visible = element.getAttribute('visible');
    if (visible) {
        buttonGroupConfig.visible = visible === 'true';
    }

    const priority = element.getAttribute('priority');
    if (priority) {
        buttonGroupConfig.priority = Number.parseInt(priority, 10);
    }

    const customToolbarPriority = element.getAttribute('customToolbarPriority');
    if (customToolbarPriority) {
        buttonGroupConfig.customToolbarPriority = Number.parseInt(customToolbarPriority, 10);
    }

    const row = element.getAttribute('row');
    if (row) {
        buttonGroupConfig.row = Number.parseInt(row, 10);
    }

    const id = element.getAttribute('id');
    if (id) {
        buttonGroupConfig.id = id;
    }

    return buttonGroupConfig;
}

/**
 * Calculates the next available customToolbarPriority for new button groups.
 * Automatically assigns customToolbarPriority to new button groups in the order they are added,
 * by calculating the highest existing customToolbarPriority and incrementing.
 *
 * @param existingButtonGroupsMap - Map of existing button group configs.
 * @returns The next available customToolbarPriority (highest existing + 1, or 1 if none exist).
 */
function getNextCustomToolbarPriority(existingButtonGroupsMap: Map<string, ButtonGroupConfig>): number {
    const existingPriorities = Array.from(existingButtonGroupsMap.values())
        .map((bg) => bg.customToolbarPriority)
        .filter((p): p is number => typeof p === 'number');
    return existingPriorities.length > 0 ? Math.max(...existingPriorities) + 1 : 1;
}

/**
 * Merges new button group selection with existing button groups.
 *
 * @param existingButtonGroupsMap - Map of existing button group configs.
 * @param rteButtonGroups - RichTextEditorButtonGroups containing new button group selection.
 * @returns Array of merged ButtonGroupConfig objects.
 */
function mergeButtonGroups(
    existingButtonGroupsMap: Map<string, ButtonGroupConfig>,
    rteButtonGroups: RichTextEditorButtonGroups
): ButtonGroupConfig[] {
    // Set nextPriority to the next available customToolbarPriority
    let nextPriority = getNextCustomToolbarPriority(existingButtonGroupsMap);

    // Merge new selection with existing selections
    return rteButtonGroups.buttonGroups?.map((selectedButtonGroup: ButtonGroupConfig) => {
        const defaultConfig = BUTTON_GROUP_CONFIGS.find((config) => config.name === selectedButtonGroup.name);
        if (!defaultConfig) {
            throw new Error(`Unknown button group: ${selectedButtonGroup.name}`);
        }

        const existingConfig = existingButtonGroupsMap.get(selectedButtonGroup.name);

        // Check if user provided any new attributes (other than just 'name')
        const hasNewAttributes = Object.keys(selectedButtonGroup).some(
            (key) => key !== 'name' && selectedButtonGroup[key as keyof ButtonGroupConfig] !== undefined
        );

        let customToolbarPriority = selectedButtonGroup.customToolbarPriority;
        if (customToolbarPriority === undefined && !existingConfig) {
            // Assign next available priority to new button group
            customToolbarPriority = nextPriority++;
        } else if (existingConfig?.customToolbarPriority !== undefined) {
            customToolbarPriority = existingConfig.customToolbarPriority;
        }

        if (existingConfig && !hasNewAttributes) {
            // Preserve existing attributes if no new attributes provided
            return { ...existingConfig, customToolbarPriority };
        }

        // Use new attributes or defaults (for both existing with new attrs and new button groups)
        return {
            name: selectedButtonGroup.name,
            buttons: selectedButtonGroup.buttons ?? defaultConfig.buttons,
            visible: selectedButtonGroup.visible,
            priority: selectedButtonGroup.priority,
            customToolbarPriority,
            row: selectedButtonGroup.row,
            id: selectedButtonGroup.id
        };
    });
}

/**
 * Processes rich text editor button groups building block.
 *
 * @param {BuildingBlock} buildingBlockData - The building block data
 * @param {ProcessingContext} context - Processing context
 */
function processRichTextEditorButtonGroups(buildingBlockData: BuildingBlock, context: ProcessingContext): void {
    const { xmlDocument, updatedAggregationPath, hasAggregation } = context;
    if (
        !isBuildingBlockType<RichTextEditorButtonGroups>(
            buildingBlockData,
            BuildingBlockType.RichTextEditorButtonGroups
        ) &&
        !isBuildingBlockType<RichTextEditorButtonGroups>(buildingBlockData, BuildingBlockType.RichTextEditor)
    ) {
        throw new Error('Expected RichTextEditorButtonGroups or RichTextEditor building block data');
    }

    const existingButtonGroupsMap = new Map<string, ButtonGroupConfig>();

    if (hasAggregation && xmlDocument && updatedAggregationPath) {
        const xpathSelect = xpath.useNamespaces((xmlDocument.firstChild as any)._nsMap);
        // Example: [<Element: richtexteditor:buttonGroups>] containing all ButtonGroup children
        const buttonGroupsElements = xpathSelect(updatedAggregationPath, xmlDocument) as Element[];

        if (buttonGroupsElements.length > 0) {
            const buttonGroupsWrapper = buttonGroupsElements[0];
            const config = getBuildingBlockConfig(BuildingBlockType.RichTextEditorButtonGroups);
            // Read all existing <ButtonGroup> child elements and store their attributes
            const existingButtonGroupElements = Array.from(buttonGroupsWrapper.childNodes).filter(
                (node) => node.nodeType === 1 && (node as Element).localName === config.aggregationConfig.elementName
            ) as Element[];

            // Build map of existing button groups with their custom attributes
            existingButtonGroupElements.forEach((element) => {
                const config = extractButtonGroupConfig(element);
                if (config) {
                    existingButtonGroupsMap.set(config.name, config);
                }
            });
            // Remove existing <buttonGroups> wrapper - will be recreated with merged data
            const buttonGroupsElement = buttonGroupsElements[0];
            // @xmldom/xmldom doesn't support Element.remove(), must use removeChild()
            buttonGroupsElement.parentNode?.removeChild(buttonGroupsElement); // NOSONAR
        }
    }

    buildingBlockData.buttonGroups = mergeButtonGroups(existingButtonGroupsMap, buildingBlockData);
}

/**
 * Updates aggregation path based on XML document structure.
 *
 * @param {Document} xmlDocument - The XML document to analyze
 * @param {string} aggregationPath - The current aggregation path
 * @param {{ aggregationName: string; elementName: string }} config - Configuration specifying aggregation and element names
 * @param config.aggregationName - Aggregation name to check in the XML
 * @param config.elementName - Element name to check in the XML
 * @param namespace - Optional namespace configuration
 * @returns {object} Object containing the updated aggregation path
 */
function updateAggregationPath(
    xmlDocument: Document,
    aggregationPath: string,
    config: { aggregationName: string; elementName: string },
    namespace?: NamespaceConfig
): { updatedAggregationPath: string; hasElement: boolean } {
    const xpathSelect = xpath.useNamespaces((xmlDocument.firstChild as any)._nsMap);

    // First, get the target element from the aggregationPath
    const targetElement = xpathSelect(aggregationPath, xmlDocument);
    if (!targetElement || !Array.isArray(targetElement) || targetElement.length === 0) {
        return { updatedAggregationPath: aggregationPath, hasElement: false };
    }

    const targetNode = targetElement[0] as Element;

    // Check if the explicit aggregation exists within the specific target element
    const hasAggregation = xpathSelect(`./*[local-name()='${config.aggregationName}']`, targetNode);
    if (hasAggregation && Array.isArray(hasAggregation) && hasAggregation.length > 0) {
        return {
            updatedAggregationPath:
                aggregationPath + `/${getOrAddNamespace(xmlDocument, namespace?.uri)}:${config.aggregationName}`,
            hasElement: true
        };
    } else {
        // Check if the default aggregation element exists within the specific target element
        const useDefaultAggregation = xpathSelect(`./*[local-name()='${config.elementName}']`, targetNode);
        if (useDefaultAggregation && Array.isArray(useDefaultAggregation) && useDefaultAggregation.length > 0) {
            return { updatedAggregationPath: aggregationPath, hasElement: true };
        }
    }

    return { updatedAggregationPath: aggregationPath, hasElement: false };
}

/**
 * Processes custom action building blocks.
 *
 * @param buildingBlockData - The building block data
 * @param context - Processing context
 */
function processAction(buildingBlockData: BuildingBlock, context: ProcessingContext): void {
    const { fs } = context;

    if (!isBuildingBlockType<Action>(buildingBlockData, BuildingBlockType.Action)) {
        throw new Error('Expected Action building block data');
    }

    const actionConfig = buildingBlockData.embeddedAction;

    if (typeof actionConfig.eventHandler === 'object') {
        const processedEventHandler = applyEventHandlerConfiguration(fs, actionConfig, actionConfig.eventHandler, {
            typescript: actionConfig.typescript
        });

        const fnName = actionConfig.eventHandler ? actionConfig.eventHandler.fnName : processedEventHandler;

        // Check if file name includes .controller
        if (actionConfig.eventHandler.fileName?.includes('.controller')) {
            // Controller method: use fnName as is, no core:require needed
            actionConfig.eventHandler = {
                fnName: `.${fnName}`
            };
        } else {
            // Custom handler file: use handler alias with core:require
            let handlerPath: string | undefined;
            if (actionConfig.eventHandler.fileName) {
                const path = context.embeddedAction?.ns?.split('.').join('/');
                handlerPath = posix.join(path ?? '', actionConfig.eventHandler.fileName);
            }

            actionConfig.eventHandler = {
                fnName: `handler.${fnName}`,
                fileName: handlerPath
            };
        }
    }
}

/**
 * Processes building block configuration.
 *
 * @param {BuildingBlock} buildingBlockData - The building block data
 * @param {Document} xmlDocument - The XML document
 * @param {string} manifestPath - The manifest file path
 * @param {Manifest} manifest - The manifest object
 * @param {string} aggregationPath - The aggregation path
 * @param {Editor} fs - The memfs editor instance
 * @returns {object} Object containing updated aggregation path and processed building block data
 */
export function processBuildingBlock<T extends BuildingBlock>(
    buildingBlockData: T,
    xmlDocument: Document,
    manifestPath: string,
    manifest: Manifest,
    aggregationPath: string,
    fs: Editor
): {
    updatedAggregationPath: string;
    processedBuildingBlockData: T;
    hasAggregation: boolean;
    aggregationNamespace: string;
} {
    let updatedAggregationPath = aggregationPath;
    let hasAggregation = false;
    let aggregationNamespace = 'macrosTable';
    let embeddedFragment: EmbeddedFragmentData | undefined;
    let viewPath: string | undefined;

    // Get configuration for the building block type
    const config = BUILDING_BLOCK_CONFIG[buildingBlockData.buildingBlockType];
    if (!config) {
        // Return defaults if no configuration is found
        return {
            updatedAggregationPath,
            processedBuildingBlockData: buildingBlockData,
            hasAggregation,
            aggregationNamespace
        };
    }

    if (
        isBuildingBlockType<RichTextEditorButtonGroups>(
            buildingBlockData,
            BuildingBlockType.RichTextEditorButtonGroups
        ) ||
        isBuildingBlockType<RichTextEditorButtonGroups>(buildingBlockData, BuildingBlockType.RichTextEditor)
    ) {
        const result = updateAggregationPath(
            xmlDocument,
            aggregationPath,
            {
                aggregationName: config.aggregationConfig.aggregationName,
                elementName: config.aggregationConfig.elementName
            },
            {
                uri: config.namespace.uri,
                prefix: config.namespace.prefix
            }
        );

        const context: ProcessingContext = {
            fs,
            xmlDocument,
            updatedAggregationPath: result.updatedAggregationPath,
            hasAggregation: result.hasElement
        };

        config.processor(buildingBlockData, context);
        aggregationNamespace = getOrAddNamespace(xmlDocument, config.namespace.uri, config.namespace.prefix);
    }

    // Process embedded fragment for types that support it
    if (
        (isBuildingBlockType<CustomColumn>(buildingBlockData, BuildingBlockType.CustomColumn) ||
            isBuildingBlockType<CustomFilterField>(buildingBlockData, BuildingBlockType.CustomFilterField) ||
            isBuildingBlockType<CustomFormField>(buildingBlockData, BuildingBlockType.CustomFormField)) &&
        buildingBlockData.embededFragment
    ) {
        embeddedFragment = setCommonDefaults(buildingBlockData.embededFragment, manifestPath, manifest);
        viewPath = join(
            embeddedFragment.path,
            `${embeddedFragment.fragmentFile ?? embeddedFragment.name}.fragment.xml`
        );

        // Use the processor function from the configuration
        const context: ProcessingContext = {
            fs,
            viewPath,
            embeddedFragment
        };
        config.processor(buildingBlockData, context);

        const result = updateAggregationPath(xmlDocument, aggregationPath, {
            aggregationName: config.aggregationConfig.aggregationName,
            elementName: config.aggregationConfig.elementName
        });
        updatedAggregationPath = result.updatedAggregationPath;
        hasAggregation = result.hasElement;
        aggregationNamespace = getOrAddNamespace(xmlDocument, config.namespace.uri, config.namespace.prefix);
    }

    if (isBuildingBlockType<Action>(buildingBlockData, BuildingBlockType.Action) && buildingBlockData.embeddedAction) {
        const result = updateAggregationPath(xmlDocument, aggregationPath, {
            aggregationName: config.aggregationConfig.aggregationName,
            elementName: config.aggregationConfig.elementName
        });

        const context: ProcessingContext = {
            fs,
            xmlDocument,
            updatedAggregationPath: result.updatedAggregationPath,
            hasAggregation: result.hasElement,
            embeddedAction: setCommonDefaults(buildingBlockData.embeddedAction, manifestPath, manifest)
        };
        config.processor(buildingBlockData, context);

        updatedAggregationPath = result.updatedAggregationPath;
        hasAggregation = result.hasElement;
        getOrAddNamespace(xmlDocument, config.namespace.uri, config.namespace.prefix);
    }

    return {
        updatedAggregationPath,
        processedBuildingBlockData: buildingBlockData,
        hasAggregation,
        aggregationNamespace
    };
}
