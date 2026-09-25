/**
 * Helper functions for copying project-specific files during migration
 * (adaptation projects and library projects)
 */

import { join } from 'node:path';
import { render, escapeXML } from 'ejs';
import { parse, stringify } from 'yaml';
import type { Editor } from 'mem-fs-editor';
import { readFile, updateFile } from '../utils/index.js';
import { migrate, type AdpWriterConfig } from '@sap-ux/adp-tooling';
import { TemplateFileName, templatesDirPath } from '../index.js';
import {
    devDependencies,
    ui5Dependencies,
    getUI5Version,
    determineMessage,
    generateToolsId,
    getLibraryTemplatesMap
} from '../utils/common.js';
import { ui5VersionRequestInfo } from '@sap-ux/ui5-info';
import { applyTemplates } from '../template/template-helpers.js';
import { commitFileSystemChanges } from './file-system.js';
import type {
    ImportProjectInfo,
    Message,
    PackageJsonMigrate,
    ProjectMigrate,
    Service,
    TemplateData,
    Ui5Yaml
} from '../types.js';

/**
 * Copy adaptation (extension) project files from templates
 *
 * @param projectInfo - Project import information
 * @param snapshotUrl - URL for UI5 snapshot version
 * @param fs - mem-fs-editor instance for file operations
 * @returns Result object with success status and messages
 */
export async function copyAdaptationFiles(
    projectInfo: ImportProjectInfo,
    snapshotUrl: string,
    fs: Editor | undefined
): Promise<{ result: boolean; messages: Message[] }> {
    const messages: Message[] = [];
    const { moduleName, moduleDescription, ui5Version, appTitle, rootPath, destination } = projectInfo;
    let result: boolean;
    try {
        const projectUI5Version = getUI5Version(ui5Version || ''); // Defaults to '' if latest

        const adpConfig: AdpWriterConfig = {
            app: {
                id: moduleName,
                reference: projectInfo.uiAdaptation.reference,
                layer: projectInfo.uiAdaptation.layer || undefined,
                title: appTitle || undefined
            },
            target: { destination, client: projectInfo.sapClient, url: projectInfo.hostname.trim() },
            ui5: {
                version: projectUI5Version,
                frameworkUrl: ui5Version?.includes('snapshot') ? snapshotUrl : ui5VersionRequestInfo.OfficialUrl
            },
            customConfig: {
                adp: {
                    environment: 'P',
                    support: {
                        id: projectInfo.moduleName,
                        version: projectInfo.appVersion.length > 0 ? projectInfo.appVersion : '1.0.0',
                        toolsId: projectInfo.sourceTemplate?.toolsId || generateToolsId() // Existing toolsIds will be overwritten
                    }
                }
            },
            package: {
                description: moduleDescription
            },
            /**
             * Optional: configuration for deployment to ABAP
             */
            deploy: undefined,
            options: {
                /**
                 * Optional: if set to true then the generated project will be recognized by the SAP Fiori tools
                 */
                fioriTools: true
            }
        };

        const updatedFs = await migrate(rootPath, adpConfig);
        // write changes to the disk
        await commitFileSystemChanges(updatedFs || fs);
        result = messages.length === 0;
    } catch (e) {
        messages.length = 0; // Reset
        messages.push({
            type: 'ERROR',
            description: `Error copying adaptation files: ${determineMessage(e)}`
        });
        result = false;
    }
    return { result, messages };
}

/**
 * Copy library project files from templates
 *
 * @param projectInfo - Project import information
 * @returns Result object with success status and messages
 */
export async function copyLibraryFiles(
    projectInfo: ImportProjectInfo
): Promise<{ result: boolean; messages: Message[] }> {
    const messages: Message[] = [];
    const { moduleName, rootPath } = projectInfo;
    let result: boolean;

    try {
        const deps = { ...devDependencies };
        delete deps.rimraf;
        const packageJson: Partial<PackageJsonMigrate> = {
            name: moduleName.toLowerCase(),
            devDependencies: deps,
            ui5Dependencies: ui5Dependencies,
            sapux: false
        };

        const ui5Yaml: Partial<Ui5Yaml> = {
            name: moduleName
        };
        const serviceData: Partial<Service> = {};
        const projectData: Partial<ProjectMigrate> = {};

        const templateData: TemplateData = {
            project: projectData,
            packageJson: packageJson,
            ui5Yaml: ui5Yaml,
            service: serviceData
        };
        // Perform migration for Reuse Library
        // 1. Create app settings (package.json)
        await applyTemplates(getLibraryTemplatesMap(), templateData, rootPath, TemplateFileName.LibrarySettings);

        //2. Create ui5.yaml
        const ui5YamlTemplate = await readFile(
            join(templatesDirPath, TemplateFileName.LibrarySettings, TemplateFileName.UI5Yaml)
        );

        const ui5YamlContent = render(ui5YamlTemplate, templateData.ui5Yaml, { escape: escapeXML });
        const ui5YamlJson = parse(ui5YamlContent);

        await updateFile(join(rootPath, TemplateFileName.UI5Yaml), stringify(ui5YamlJson));
        result = messages.length === 0;
    } catch (e) {
        messages.length = 0; // Reset
        messages.push({
            type: 'ERROR',
            description: `Error copying library files: ${
                e.name === 'MigrationError' ? e.message.toString() : determineMessage(e)
            }`
        });
        result = false;
    }
    return { result, messages };
}
