import { generateFreestyleOPAFiles } from '../../ui5-test-writer';
import { compareUI5VersionGte, ui5LtsVersion_1_71 } from '@sap-ux/ui5-application-writer';
import { FreestyleApp } from './types';
import type { Editor } from 'mem-fs-editor';
import type { BasicAppSettings } from './types';
import type { Logger } from '@sap-ux/logger';

/**
 * Generates formatted application ID with slashes based on namespace, name, and TypeScript settings.
 * @param {string} [name] - The application name.
 * @param {string} [namespace] - The application namespace.
 * @param {boolean} [enableTypescript] - Whether TypeScript is enabled.
 * @returns {string} The formatted application ID with slashes.
 */
function formatAppId(name?: string, namespace?: string, enableTypescript?: boolean): string {
    const sanitizeNamespace = (namespace?: string) => {
        if (!namespace) return '';
        // Replace dots with slashes and remove trailing slashes
        return namespace.replace(/\./g, '/').replace(/\/$/, '');
    };

    const sanitizeName = (name?: string) => {
        // If the name is defined, remove underscores and hyphens, else return an empty string
        return name ? name.replace(/[_-]/g, '') : '';
    };

    if (enableTypescript) {
        const sanitizedNamespace = sanitizeNamespace(namespace);
        const sanitizedName = sanitizeName(name);
        // If TypeScript is enabled, Return formatted appId with slashes, ensuring no unnecessary slashes at the end
        return `${sanitizedNamespace}${sanitizedNamespace && sanitizedName ? '/' : ''}${sanitizedName}`;
    } else {
        const sanitizedNamespace = sanitizeNamespace(namespace).replace(/\//g, '');
        const sanitizedName = name ?? '';
        // Return formatted appId without slashes in the namespace, adding a slash between namespace and name
        return `${sanitizedNamespace}${sanitizedNamespace && sanitizedName ? '/' : ''}${sanitizedName}`;
    }
}

/**
 * Generates and writes UI5 test files based on the provided application configuration.
 * @template T
 * @param {string} basePath - The base path where test files will be generated.
 * @param {FreestyleApp<T>} ffApp - The freestyle application configuration.
 * @param {Editor} [fs] - The file system editor instance.
 * @param {Logger} [log] - The logger instance.
 */
export async function writeTestFiles<T>(basePath: string, ffApp: FreestyleApp<T>, fs?: Editor, log?: Logger): Promise <void> {
    const templateLtsVersion_1_120 = '1.120.0';
    const templateUi5Version = ffApp.ui5?.version
        ? compareUI5VersionGte(ffApp.ui5.version, templateLtsVersion_1_120)
            ? templateLtsVersion_1_120
            : ui5LtsVersion_1_71
        : templateLtsVersion_1_120;

    const config = {
        appId: ffApp.app.id,
        viewName: (ffApp.template.settings as BasicAppSettings).viewName,
        ui5Theme: ffApp.ui5?.ui5Theme,
        ui5Version: templateUi5Version,
        applicationTitle: ffApp.app.title,
        applicationDescription: ffApp.app.description,
        appIdWithSlash: formatAppId(ffApp.package.name, ffApp.app.namespace, ffApp.appOptions?.typescript),
        enableTypeScript: ffApp.appOptions?.typescript
    };
    await generateFreestyleOPAFiles(basePath, config, fs, log);
}