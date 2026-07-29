import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { readFile, updateFile, generateTemplate, updateThemeAttribute } from '../utils/index.js';
import { DirName } from '../project-spec-types.js';
import { TemplateFileName, templatesDirPath } from '../index.js';
import { MigrationTypes } from '../utils/constants.js';
import type { TemplateData, TemplateMap } from '../types.js';

/**
 * Applies EJS templates to generate project files
 *
 * @param templates - Map of template names to their properties
 * @param templateData - Data to populate templates with
 * @param projectRoot - Root path of the project
 * @param templateRoot - Optional root directory for templates (defaults to AppSettings)
 * @param ui5Version - Optional UI5 version for theme updates
 */
export async function applyTemplates(
    templates: TemplateMap,
    templateData: TemplateData,
    projectRoot: string,
    templateRoot?: string,
    ui5Version?: string
): Promise<void> {
    const baseTemplateRoot = join(templatesDirPath, templateRoot || TemplateFileName.AppSettings);
    await Promise.all(
        Object.keys(templates).map(async (templateName) => {
            const templateProps = templates[templateName];
            await generateTemplate(templateData, projectRoot, baseTemplateRoot, templateName, templateProps);
        })
    );

    if (
        templateData.project.type === MigrationTypes.projectExtension &&
        existsSync(join(projectRoot, DirName.Webapp, TemplateFileName.IndexHtml))
    ) {
        // For project extensions, we usually leave the index.html file unchanged.
        // However, since the Belize theme is no longer available after UI5 version 1.136.0,
        // we need to update the `data-sap-ui-theme` attribute in the index.html file
        // to use the appropriate UI5 theme specified in the project configuration.
        const templateName = TemplateFileName.IndexHtml;
        try {
            const htmlPath = join(projectRoot, DirName.Webapp, templateName);
            const html = (await readFile(htmlPath)).toString();
            const updatedHtml = updateThemeAttribute(html, ui5Version ?? '', templateData.project.ui5Theme ?? '');
            await updateFile(htmlPath, updatedHtml);
            return;
        } catch (e) {
            console.log(`Error writing file ${templateName} - ${e}`);
        }
    }
}
