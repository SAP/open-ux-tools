/**
 * Helper functions for generating UI5 YAML files during migration
 * (ui5.yaml, ui5-local.yaml, ui5-mock.yaml)
 *
 * Uses modern @sap-ux/ui5-config API via adapter layer instead of EJS templates.
 */

import { join } from 'node:path';
import { updateFile } from '../utils/index.js';
import { TemplateFileName } from '../index.js';
import type { TemplateData, NeoappDestination, Message, Ui5MockYaml } from '../types.js';
import { MigrationTypes } from '../utils/constants.js';
import {
    generateUI5YamlContent,
    generateUI5LocalYamlContent,
    generateUI5MockYamlContent
} from '../adapters/ui5-config-adapter.js';

/**
 * Configuration for generating UI5 YAML files
 */
export interface UI5YamlGenerationConfig {
    templateData: TemplateData;
    neoappDestinations?: NeoappDestination[];
    messages: Message[];
    destination?: string;
    firstNeoAppDestination?: string;
    webappPath: string;
    setUI5version: boolean;
    rootPath: string;
    templateRoot: string;
}

/**
 * Configuration for generating UI5 local YAML files
 */
export interface UI5LocalYamlGenerationConfig {
    templateData: TemplateData;
    neoappDestinations?: NeoappDestination[];
    messages: Message[];
    destination?: string;
    firstNeoAppDestination?: string;
    webappPath: string;
    rootPath: string;
    templateRoot: string;
}

/**
 * Configuration for generating UI5 mock YAML files
 */
export interface UI5MockYamlGenerationConfig {
    templateData: TemplateData;
    webappPath: string;
    setUI5version: boolean;
    rootPath: string;
    templateRoot: string;
    hasDataSource: boolean;
}

/**
 * Configuration for generating all UI5 YAML files
 */
export interface UI5YamlAllFilesConfig {
    templateData: TemplateData;
    neoappDestinations?: NeoappDestination[];
    messages: Message[];
    destination?: string;
    firstNeoAppDestination?: string;
    webappPath: string;
    setUI5version: boolean;
    rootPath: string;
    templateRoot: string;
    hasDataSource: boolean;
}

/**
 * Generate and write ui5.yaml file using modern @sap-ux/ui5-config API
 *
 * @param config - Configuration object containing all required parameters
 */
export async function generateAndWriteUI5Yaml(config: UI5YamlGenerationConfig): Promise<void> {
    const {
        templateData,
        neoappDestinations,
        messages,
        destination,
        firstNeoAppDestination,
        webappPath,
        setUI5version,
        rootPath
    } = config;

    const ui5YamlContent = await generateUI5YamlContent(
        templateData,
        neoappDestinations,
        messages,
        destination,
        firstNeoAppDestination,
        webappPath,
        setUI5version
    );

    await updateFile(join(rootPath, TemplateFileName.UI5Yaml), ui5YamlContent);
}

/**
 * Generate and write ui5-local.yaml file using modern @sap-ux/ui5-config API
 *
 * @param config - Configuration object containing all required parameters
 */
export async function generateAndWriteUI5LocalYaml(config: UI5LocalYamlGenerationConfig): Promise<void> {
    const {
        templateData,
        neoappDestinations,
        messages,
        destination,
        firstNeoAppDestination,
        webappPath,
        rootPath
    } = config;
    // Only generate for regular projects, not library or extension projects
    if (templateData.project.type !== MigrationTypes.project) {
        return;
    }

    const ui5LocalYamlContent = await generateUI5LocalYamlContent(
        templateData,
        neoappDestinations,
        messages,
        destination,
        firstNeoAppDestination,
        webappPath
    );

    await updateFile(join(rootPath, TemplateFileName.UI5LocalYaml), ui5LocalYamlContent);
}

/**
 * Generate and write ui5-mock.yaml file if required using modern @sap-ux/ui5-config API
 *
 * @param config - Configuration object containing all required parameters
 */
export async function generateAndWriteUI5MockYaml(config: UI5MockYamlGenerationConfig): Promise<void> {
    const { templateData, webappPath, setUI5version, rootPath, hasDataSource } = config;
    if (!hasDataSource) {
        return;
    }

    // Only generate if mockdataRootPath is configured
    if (!(templateData.ui5Yaml as Partial<Ui5MockYaml>)?.mockdataRootPath) {
        return;
    }

    const ui5MockYamlContent = await generateUI5MockYamlContent(templateData, webappPath, setUI5version);

    await updateFile(join(rootPath, TemplateFileName.UI5MockYaml), ui5MockYamlContent);
}

/**
 * Generate all UI5 YAML files (ui5.yaml, ui5-local.yaml, ui5-mock.yaml)
 * using modern @sap-ux/ui5-config API
 *
 * @param config - Configuration object containing all required parameters
 */
export async function generateAllUI5YamlFiles(config: UI5YamlAllFilesConfig): Promise<void> {
    const {
        templateData,
        neoappDestinations,
        messages,
        destination,
        firstNeoAppDestination,
        webappPath,
        setUI5version,
        rootPath,
        hasDataSource
    } = config;

    // Generate all YAML files in parallel for better performance
    await Promise.all([
        generateAndWriteUI5Yaml({
            templateData,
            neoappDestinations,
            messages,
            destination,
            firstNeoAppDestination,
            webappPath,
            setUI5version,
            rootPath,
            templateRoot: '' // No longer used, kept for interface compatibility
        }),
        generateAndWriteUI5LocalYaml({
            templateData,
            neoappDestinations,
            messages,
            destination,
            firstNeoAppDestination,
            webappPath,
            rootPath,
            templateRoot: '' // No longer used, kept for interface compatibility
        }),
        generateAndWriteUI5MockYaml({
            templateData,
            webappPath,
            setUI5version,
            rootPath,
            templateRoot: '', // No longer used, kept for interface compatibility
            hasDataSource
        })
    ]);
}
