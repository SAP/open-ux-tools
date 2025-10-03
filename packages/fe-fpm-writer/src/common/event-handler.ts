import type { Editor } from 'mem-fs-editor';
import { join } from 'path';
import { getTemplatePath } from '../templates';
import type { TextFragmentInsertion, EventHandlerConfiguration, InternalCustomElement } from '../common/types';
import { insertTextAtPosition, insertTextAtAbsolutePosition } from '../common/utils';

/**
 * Interface to describe event handler configuration options used during creation.
 */
interface EventHandlerConfigurationOptions {
    // append controller suffix to new file, default value is "false"
    controllerSuffix?: boolean;
    // whether create Typescript file instead of Javascript
    typescript?: boolean;
    // path to the template without the extension, default value is "common/EventHandler"
    templatePath?: string;
    // event handler function name - 'onPress' is default, default value is "onPress"
    eventHandlerFnName?: string;
}

type EventHandlerTypescriptParameters = EventHandlerTypescriptParameter[];

/**
 * Interface to describe the input parameters for the generated event handler function.
 */
export interface EventHandlerTypescriptParameter {
    /** Variable name in TypeScript style */
    name: string;
    /** Variable name in JavaScript style (Hungarian notation) */
    jsName: string;
    description: string;
    importType: string;
    /**
     * Optional. If not defined, the parameter type will be taken from `importType`.
     */
    paramType?: string;
    importSource: string;
}

/**
 * Default values for the input parameters of newly created event handlers.
 */
export const defaultParameter: EventHandlerTypescriptParameter = {
    name: 'event',
    jsName: 'oEvent',
    description: 'the event object provided by the event provider.',
    importType: 'UI5Event',
    importSource: 'sap/ui/base/Event'
};

/**
 * Values for the input parameters of newly created event handlers that are added as manifest actions.
 */
export const contextParameter: EventHandlerTypescriptParameter = {
    name: 'context',
    jsName: 'oContext',
    description: 'the context of the page on which the event was fired. `undefined` for list report page.',
    importType: 'Context',
    paramType: 'Context | undefined',
    importSource: 'sap/ui/model/odata/v4/Context'
};
export const selectedContextsParameter: EventHandlerTypescriptParameter = {
    name: 'selectedContexts',
    jsName: 'aSelectedContexts',
    description: 'the selected contexts of the table rows.',
    importType: 'Context',
    paramType: 'Context[]',
    importSource: 'sap/ui/model/odata/v4/Context'
};

/**
 * Method returns file name to use in namespace.
 *
 * @param fileName - event handler file name
 * @param controllerPrefix - controller prefix '.extension'
 * @returns {string} file name part for namespace
 */
function getFileName(fileName: string, controllerPrefix?: string): string {
    let resolvedName;
    // For name part in namespace we use passed file name or if it's controller extension, then remove 'controller' part from path
    // 'Handler.controller' should be resolved as 'Handler' in namespace
    if (controllerPrefix && fileName.endsWith('.controller')) {
        resolvedName = fileName.replace('.controller', '');
    } else {
        resolvedName = fileName;
    }
    return resolvedName;
}

/**
 * Method creates or updates handler js file and update 'settings.eventHandler' entry with namespace path entry to method.
 *
 * @param fs - the memfs editor instance
 * @param config - configuration
 * @param eventHandler - eventHandler for creation
 * @param eventHandlerOptions - eventHandler options
 * @param parameters - parameters and its configurations for the event handler
 * @returns {string} full namespace path to method
 */
export function applyEventHandlerConfiguration(
    fs: Editor,
    config: Partial<InternalCustomElement>,
    eventHandler: EventHandlerConfiguration | true | string,
    eventHandlerOptions: EventHandlerConfigurationOptions,
    parameters: EventHandlerTypescriptParameters = [defaultParameter]
): string {
    const { controllerSuffix, typescript, templatePath = 'common/EventHandler' } = eventHandlerOptions;
    let { eventHandlerFnName = 'onPress' } = eventHandlerOptions;
    if (typeof eventHandler === 'string') {
        // Existing event handler is passed - no need for file creation/update
        return eventHandler;
    }
    let insertScript: TextFragmentInsertion | undefined;
    let controllerPrefix: string | undefined = '';
    // By default - use config name for created file name
    let fileName = config.name;
    // Name part used in namespace
    let resolvedName = fileName;
    if (typeof eventHandler === 'object') {
        controllerPrefix = eventHandler.controllerPrefix;
        if (eventHandler.fnName) {
            eventHandlerFnName = eventHandler.fnName;
        }
        insertScript = eventHandler.insertScript;
        if (eventHandler.fileName) {
            // Use passed file name
            fileName = eventHandler.fileName;
            resolvedName = getFileName(fileName, controllerPrefix);
        }
    }

    const ext = typescript ? 'ts' : 'js';
    const controllerPath = join(config.path || '', `${fileName}${controllerSuffix ? '.controller' : ''}.${ext}`);
    if (!fs.exists(controllerPath)) {
        fs.copyTpl(getTemplatePath(`${templatePath}.${ext}`), controllerPath, {
            eventHandlerFnName,
            parameters,
            ...config
        });
    } else if (insertScript) {
        // Read current file content
        let content = fs.read(controllerPath);
        // Append content with additional script fragment
        if (typeof insertScript.position === 'object') {
            content = insertTextAtPosition(insertScript.fragment, content, insertScript.position);
        } else {
            content = insertTextAtAbsolutePosition(insertScript.fragment, content, insertScript.position);
        }
        fs.write(controllerPath, content);
    }
    // Return full namespace path to method
    const fullNamespace = `${config.ns}.${resolvedName}.${eventHandlerFnName}`;
    return controllerPrefix ? `${controllerPrefix}.${fullNamespace}` : `${fullNamespace}`;
}
