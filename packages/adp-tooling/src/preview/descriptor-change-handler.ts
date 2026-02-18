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

export const customColumnFragmentConfig = {
    path: 'v4/mdc-custom-column-config.xml',
    getData: (): { ids: Record<string, string> } => {
        const uuid = randomBytes(4).toString('hex');
        return {
            ids: {
                text: `text-${uuid}`
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
 * Gets config based on change property path.
 *
 * @param change - The AppDescriptorV4Change object containing change details.
 * @returns The configuration object or undefined if no matching config is found.
 */
function getConfig(
    change: AppDescriptorV4Change
): { path: string; getData: () => { ids: Record<string, string> } } | undefined {
    const propertyPath = change.content.entityPropertyChange.propertyPath;

    const isCustomSectionPropertyPath = propertyPath.startsWith('content/body/sections/');
    // Pattern matches:
    // - controlConfiguration/@com.sap.vocabularies.UI.v1.LineItem/columns/columnId
    // - controlConfiguration/@com.sap.vocabularies.UI.v1.LineItem#qualifier/columns/columnId
    // - controlConfiguration/navigationPath/@com.sap.vocabularies.UI.v1.LineItem/columns/columnId
    // - controlConfiguration/navigationPath/@com.sap.vocabularies.UI.v1.LineItem#qualifier/columns/columnId
    const isCustomColumnPropertyPath =
        /^controlConfiguration\/(?:[^/@]+\/)?@[^/]+\.LineItem(?:#[^/]+)?\/columns\/[^/]+$/.test(propertyPath);

    if (isCustomSectionPropertyPath) {
        return customFragmentConfig;
    } else if (isCustomColumnPropertyPath) {
        return customColumnFragmentConfig;
    }
    return undefined;
}

/**
 * Adds a custom XML fragment file based on the provided AppDescriptorV4Change and template configuration.
 *
 * @param basePath - The base path where the fragment should be created.
 * @param change - The AppDescriptorV4Change object containing change details.
 * @param fs - The mem-fs-editor instance for file operations.
 * @param logger - The logger instance for logging information and errors.
 */
export function addCustomFragment(basePath: string, change: AppDescriptorV4Change, fs: Editor, logger: Logger): void {
    const propertyValue = change.content.entityPropertyChange.propertyValue;
    const config = getConfig(change);
    if (hasTemplate(propertyValue) && config) {
        const { template } = propertyValue;
        const path = getFragmentPathFromTemplate(template, change);
        try {
            if (!path) {
                throw new Error('Fragment Path could not be determined');
            }
            const fragmentPath = `${path}.fragment.xml`;
            const fullPath = join(basePath, fragmentPath);
            const fragmentTemplatePath = join(__dirname, '../../templates/rta', config.path);
            const text = fs.read(fragmentTemplatePath);
            // Safe: Template files are from our own codebase (templates/rta/), config.path is from getConfig()
            // which only returns predefined paths (customFragmentConfig or customColumnFragmentConfig).
            // Template data comes from controlled config.getData() which only generates UUIDs for IDs.
            const template = render(text, {
                viewName: undefined,
                controlType: undefined,
                targetAggregation: undefined,
                ...config.getData()
            });
            fs.write(fullPath, template);
            logger.info(`XML Fragment "${fragmentPath}" was created`);
        } catch (error) {
            logger.error(`Failed to create XML Fragment: ${error}`);
        }
    }
}
