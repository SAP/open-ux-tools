import type { Editor } from 'mem-fs-editor';
import type { AppDescriptorV4Change, CommonAdditionalChangeInfoProperties } from '../types';
import type { Logger } from '@sap-ux/logger';
import { DirName } from '@sap-ux/project-access';
import { render } from 'ejs';
import { join } from 'path';
import { fragmentTemplateDefinitions } from './change-handler';

/**
 * Checks if the given object has a 'template' property of type string.
 *
 * @param obj - The object to check.
 * @returns True if the object has a 'template' property of type string, false otherwise.
 */
export function hasTemplate(obj: unknown): obj is { template: string } {
    return typeof obj === 'object' && obj !== null && 'template' in obj && typeof obj.template === 'string';
}

/**
 * Adds a custom XML fragment file based on the provided AppDescriptorV4Change and template configuration.
 *
 * @param basePath - The base path where the fragment should be created.
 * @param change - The AppDescriptorV4Change object containing change details.
 * @param fs - The mem-fs-editor instance for file operations.
 * @param logger - The logger instance for logging information and errors.
 * @param additionalChangeInfo - Optional additional change information properties.
 */
export function addCustomFragment(
    basePath: string,
    change: AppDescriptorV4Change,
    fs: Editor,
    logger: Logger,
    additionalChangeInfo?: CommonAdditionalChangeInfoProperties
): void {
    const propertyValue = change.content.entityPropertyChange.propertyValue;
    const isCustomSectionPropertyPath =
        change.content.entityPropertyChange.propertyPath.startsWith('content/body/sections/');
    if (isCustomSectionPropertyPath && hasTemplate(propertyValue)) {
        const { template } = propertyValue;
        const path = template.replace(`${change.reference}.changes.`, '').replace(/^\./, '').replace(/\./g, '/');
        const fragmentPath = `${path}.fragment.xml`;
        const fullPath = join(basePath, DirName.Changes, fragmentPath);
        const templateConfig = fragmentTemplateDefinitions[additionalChangeInfo?.templateName ?? ''];
        try {
            if (templateConfig) {
                const fragmentTemplatePath = join(__dirname, '../../templates/rta', templateConfig.path);
                const text = fs.read(fragmentTemplatePath);
                const template = render(text, templateConfig.getData({}));
                fs.write(fullPath, template);
            } else {
                // copy default fragment template
                const templateName = 'fragment.xml'; /* TemplateFileName.Fragment */
                const fragmentTemplatePath = join(__dirname, '../../templates/rta', templateName);
                fs.copy(fragmentTemplatePath, fullPath);
            }
            logger.info(`XML Fragment "${fragmentPath}" was created`);
        } catch (error) {
            logger.error(`Failed to create XML Fragment "${fragmentPath}": ${error}`);
        }
    }
}
