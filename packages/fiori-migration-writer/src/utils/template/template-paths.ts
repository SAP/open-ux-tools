// CLASSIFICATION: [OPEN]
import { join } from 'node:path';
import type { TemplateProperties } from '../../types.js';

/**
 * Information about resolved template paths
 */
export interface TemplatePathInfo {
    /** Full template name including path (e.g., "webapp/index.html") */
    fullTemplateName: string;
    /** Full target name including path (e.g., "webapp/index.html") */
    fullTargetName: string;
    /** Absolute path to target file */
    targetFile: string;
}

/**
 * Resolve template paths from properties
 *
 * Takes template properties and resolves them to full paths for reading the template
 * and writing the output file.
 *
 * @param projectRoot - Root directory of the project
 * @param templateRoot - Root directory containing templates
 * @param templateName - Name of the template file
 * @param templateProps - Template properties including paths
 * @returns Resolved path information
 */
export function resolveTemplatePaths(
    projectRoot: string,
    templateRoot: string,
    templateName: string,
    templateProps: TemplateProperties
): TemplatePathInfo {
    const { path = '', targetPath = '', targetName = undefined } = templateProps;

    const fullTemplateName = join(path, templateName);
    const fullTargetName = join(targetPath, targetName || templateName);
    const targetFile = join(projectRoot, fullTargetName);

    return {
        fullTemplateName,
        fullTargetName,
        targetFile
    };
}
