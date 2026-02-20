import type { Editor } from 'mem-fs-editor';
import { type AppDescriptorV4Change } from '../types';
import type { Logger } from '@sap-ux/logger';
import { join } from 'node:path';
import { getFragmentPathFromTemplate } from './utils';
import { randomBytes } from 'node:crypto';
import { render } from 'ejs';

export const customFragmentConfig = {
    path: 'v4/custom-section.xml',
    getData: (): { ids: Record<string, string> } => {
        const uuid = randomBytes(4).toString('hex');
        return {
            ids: {
                hBox: `hbox-${uuid}`
            }
        };
    }
};

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
 */
export function addCustomSectionFragment(
    basePath: string,
    change: AppDescriptorV4Change,
    fs: Editor,
    logger: Logger
): void {
    const propertyValue = change.content.entityPropertyChange.propertyValue;
    const isCustomSectionPropertyPath =
        change.content.entityPropertyChange.propertyPath.startsWith('content/body/sections/');
    if (isCustomSectionPropertyPath && hasTemplate(propertyValue)) {
        const { template } = propertyValue;
        const path = getFragmentPathFromTemplate(template, change);
        try {
            if (!path) {
                throw new Error('Fragment Path could not be determined');
            }
            const fragmentPath = `${path}.fragment.xml`;
            const fullPath = join(basePath, fragmentPath);
            const fragmentTemplatePath = join(__dirname, '../../templates/rta', customFragmentConfig.path);
            const text = fs.read(fragmentTemplatePath);
            const template = render(text, customFragmentConfig.getData());
            fs.write(fullPath, template);
            logger.info(`XML Fragment "${fragmentPath}" was created`);
        } catch (error) {
            logger.error(`Failed to create XML Fragment: ${error}`);
        }
    }
}
