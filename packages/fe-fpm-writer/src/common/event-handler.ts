import type { Editor } from 'mem-fs-editor';
import { join } from 'path';
import { getTemplatePath } from '../templates';
import type { TextFragmentInsertion, EventHandlerConfiguration, InternalCustomElement } from '../common/types';
import { insertTextAtPosition, insertTextAtAbsolutePosition } from '../common/utils';

/**
 * Interface to describe event handler configuration options used during creation.
 */
interface EventHandlerConfigurationOptions  {
    // append controller suffix to new file, default value is "false"
    controllerSuffix?: boolean,
    // whether create Typescript file instead of Javascript
    typescript?: boolean,
    // path to the template without the extension, default value is "common/EventHandler"
    templatePath?: string;
    // event handler function name - 'onPress' is default, default value is "onPress"
    eventHandlerFnName?: string
}

/**
 * Interface to describe the input parameters for the generated event handler function.
 */
export interface EventHandlerTypescriptParameters {
    name: string;
    description: string;
    importType: string;
    importSource: string;
}

/**
 * Default values for the input parameters of newly created event handlers.
 */
export const defaultParameter: EventHandlerTypescriptParameters = {
    name: 'event',
    description: 'the event object provided by the event provider',
    importType: 'UI5Event',
    importSource: 'sap/ui/base/Event'
};

/**
 * Values for the input parameters of newly created event handlers that are added as manifest actions.
 */
export const contextParameter: EventHandlerTypescriptParameters = {
    name: 'pageContext',
    description: 'the context of the page on which the event was fired',
    importType: 'Context',
    importSource: 'sap/ui/model/odata/v4/Context'
};

/**
 * Method creates or updates handler js file and update 'settings.eventHandler' entry with namespace path entry to method.
 *
 * @param fs - the memfs editor instance
 * @param config - configuration
 * @param eventHandler - eventHandler for creation
 * @param eventHandlerOptions - eventHandler options
 * @param parameters - parameter configurations for the event handler
 * @returns {string} full namespace path to method
 */
export function applyEventHandlerConfiguration(
    fs: Editor,
    config: Partial<InternalCustomElement>,
    eventHandler: EventHandlerConfiguration | true | string,
    eventHandlerOptions: EventHandlerConfigurationOptions,
    parameters: EventHandlerTypescriptParameters = defaultParameter
): string {
    const controllerSuffix = eventHandlerOptions.controllerSuffix ?? false;
    const typescript = eventHandlerOptions.typescript;
    const templatePath = eventHandlerOptions.templatePath ?? 'common/EventHandler';
    let eventHandlerFnName = eventHandlerOptions.eventHandlerFnName ?? 'onPress';
    if (typeof eventHandler === 'string') {
        // Existing event handler is passed - no need for file creation/update
        return eventHandler;
    }
    let insertScript: TextFragmentInsertion | undefined;
    // By default - use config name for created file name
    let fileName = config.name;
    if (typeof eventHandler === 'object') {
        if (eventHandler.fnName) {
            eventHandlerFnName = eventHandler.fnName;
        }
        insertScript = eventHandler.insertScript;
        if (eventHandler.fileName) {
            // Use passed file name
            fileName = eventHandler.fileName;
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
    return `${config.ns}.${fileName}.${eventHandlerFnName}`;
}
