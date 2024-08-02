import { v4 as uuidv4 } from 'uuid';
import { ToolsSupport } from '../../types';
import { getPackageJSONInfo } from '../project-utils';

export function getSupportForUI5Yaml(toolsId?: string): ToolsSupport {
    const packageJSON = getPackageJSONInfo();

    return {
        id: packageJSON.name,
        version: packageJSON.version,
        toolsId: toolsId ?? uuidv4()
    };
}
