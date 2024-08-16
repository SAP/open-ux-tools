import { v4 as uuidv4 } from 'uuid';

import type { ToolsSupport } from '../../types';
import { getPackageJSONInfo } from '../project-utils';

/**
 * Retrieves the current package.json.
 *
 * @param {string} [toolsId] - An optional unique identifier for the tools environment; if not provided, a new UUID is generated.
 * @returns {ToolsSupport} An object containing the package name, version, and a tools identifier.
 */
export function getSupportForUI5Yaml(toolsId?: string): ToolsSupport {
    const packageJSON = getPackageJSONInfo();

    return {
        id: packageJSON.name,
        version: packageJSON.version,
        toolsId: toolsId ?? uuidv4()
    };
}
