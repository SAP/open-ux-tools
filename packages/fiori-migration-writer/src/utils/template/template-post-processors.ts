// CLASSIFICATION: [OPEN]
import type { Data } from 'ejs';
import { TemplateFileName } from '../../index.js';
import { FileName } from '../../project-spec-types.js';
import { handleGitIgnoreFile, handlePackageJsonFile, handleLocateReuseLibsFile } from '../template-generators/index.js';

// Package.json template name
const packageJsonTmplName = `${FileName.Package}.tmpl`;

/**
 * Apply file-specific post-processing handlers
 *
 * Some template files need special handling after rendering but before writing.
 * This function applies the appropriate handler based on the template name.
 *
 * Handlers:
 * - LocateReuseLibs: Adds reuse library configuration
 * - GitIgnore: Merges with existing .gitignore if present
 * - package.json: Merges with existing package.json if present
 *
 * @param templateName - Name of the template being processed
 * @param templateContent - Rendered template content
 * @param projectRoot - Root directory of the project
 * @param targetFile - Absolute path to the target file
 * @param templateData - Original template data (for package.json handler)
 * @returns Post-processed template content
 */
export async function applyFileSpecificHandlers(
    templateName: string,
    templateContent: string,
    projectRoot: string,
    targetFile: string,
    templateData: Data
): Promise<string> {
    // Handle LocateReuseLibs template
    if (templateName === TemplateFileName.LocateReuseLibs) {
        return handleLocateReuseLibsFile(templateContent, templateData);
    }

    // Handle .gitignore template
    if (templateName === TemplateFileName.GitIgnoreTmpl) {
        return handleGitIgnoreFile(targetFile, templateContent);
    }

    // Handle package.json template
    if (templateName === packageJsonTmplName) {
        return handlePackageJsonFile(projectRoot, targetFile, templateContent, templateData);
    }

    // No special handling needed
    return templateContent;
}
