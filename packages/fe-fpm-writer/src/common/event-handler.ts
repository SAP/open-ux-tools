import type { Editor } from 'mem-fs-editor';
import { join } from 'path';
import type { TextFragmentInsertion, EventHandlerConfiguration, InternalCustomElement } from '../common/types';
import { insertTextAtPosition } from '../common/utils';

/**
 * Method creates or updates handler js file and update 'settings.eventHandler' entry with namespace path entry to method.
 *
 * @param {Editor} fs - the memfs editor instance
 * @param {string} root - the root path
 * @param {InternalCustomAction} config - action configuration
 * @param {true | EventHandlerConfiguration} eventHandler - eventHandler for creation
 * @param {boolean} [controllerSuffix=false] - append controller suffix to new file
 * @returns {string} full namespace path to method
 */
export function applyEventHandlerConfiguration(
    fs: Editor,
    root: string,
    config: Partial<InternalCustomElement>,
    eventHandler: EventHandlerConfiguration | true,
    controllerSuffix = false
): string {
    // New event handler function name - 'onPress' is default
    let eventHandlerFnName = 'onPress';
    let insertScript: TextFragmentInsertion | undefined;
    // By default - use action name for js file name
    let fileName = `${config.name}`;
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
    const controllerPath = join(config.path || '', `${fileName}${controllerSuffix ? '.controller' : ''}.js`);
    if (!fs.exists(controllerPath)) {
        fs.copyTpl(join(root, 'common/EventHandler.js'), controllerPath, {
            eventHandlerFnName
        });
    } else if (insertScript) {
        // Read current file content
        let content = fs.read(controllerPath);
        // Append conent with additional script fragment
        content = insertTextAtPosition(insertScript.fragment, content, insertScript.position);
        fs.write(controllerPath, content);
    }
    // Return full namespace path to method
    return `${config.ns}.${fileName}.${eventHandlerFnName}`;
}
