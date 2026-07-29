/**
 * Helper functions for generating UI5 YAML files during migration
 * (ui5.yaml, ui5-local.yaml, ui5-mock.yaml)
 */

import { join } from 'node:path';
import { render, escapeXML } from 'ejs';
import { parse, stringify } from 'yaml';
import { readFile, updateFile } from '../utils/index.js';
import type { MiddlewareProxy } from '../project-spec-types.js';
import { TemplateFileName } from '../index.js';
import { FIORI_TOOLS_PROXY } from '../utils/common.js';
import { updateNeoYamlBackends, updateYamlBackends } from './backend.js';
import { setProxyUI5Version, setAppreloadPath, setWebappPath, cleanupBackendNullUrls } from '../data/yaml.js';
import type { TemplateData, NeoappDestination, Message, Ui5MockYaml } from '../types.js';
import { MigrationTypes } from '../utils/constants.js';

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
 * Generate and write ui5.yaml file
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
        rootPath,
        templateRoot
    } = config;
    const ui5YamlTemplate = await readFile(join(templateRoot, TemplateFileName.UI5Yaml));

    const ui5YamlContent = render(ui5YamlTemplate, templateData.ui5Yaml, { escape: escapeXML });
    const ui5YamlJson = parse(ui5YamlContent);

    ui5YamlJson.server.customMiddleware.forEach((middleware: MiddlewareProxy, index: number) => {
        if (middleware?.name === FIORI_TOOLS_PROXY) {
            //backend with many destinations from neo-app
            if (neoappDestinations && neoappDestinations?.length > 0) {
                ui5YamlJson.server.customMiddleware[index].configuration.backend = updateNeoYamlBackends(
                    neoappDestinations,
                    ui5YamlJson.server.customMiddleware[index].configuration.backend,
                    templateData,
                    messages,
                    destination,
                    firstNeoAppDestination
                );
            }
            //other backends
            if (setUI5version) {
                setProxyUI5Version(ui5YamlJson, templateData.ui5Yaml?.ui5Version);
            }
            ui5YamlJson.server.customMiddleware[index].configuration = updateYamlBackends(
                ui5YamlJson.server.customMiddleware[index].configuration,
                templateData
            );
        }
        setAppreloadPath(ui5YamlJson, webappPath);
    });
    // Set webapp path
    setWebappPath(ui5YamlJson, webappPath);

    cleanupBackendNullUrls(ui5YamlJson);
    await updateFile(join(rootPath, TemplateFileName.UI5Yaml), stringify(ui5YamlJson));
}

/**
 * Generate and write ui5-local.yaml file
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
        rootPath,
        templateRoot
    } = config;
    // Only generate for regular projects, not library or extension projects
    if (templateData.project.type !== MigrationTypes.project) {
        return;
    }

    const ui5LocalYamlTemplate = await readFile(join(templateRoot, TemplateFileName.UI5LocalYaml));

    const ui5LocalYamlContent = render(ui5LocalYamlTemplate, templateData.ui5Yaml, { escape: escapeXML });
    const ui5LocalYamlJson = parse(ui5LocalYamlContent);

    ui5LocalYamlJson.server.customMiddleware.forEach((middleware: MiddlewareProxy, index: number) => {
        if (middleware?.name === FIORI_TOOLS_PROXY) {
            //backend with many destinations from neo-app
            if (neoappDestinations && neoappDestinations?.length > 0) {
                ui5LocalYamlJson.server.customMiddleware[index].configuration.backend = updateNeoYamlBackends(
                    neoappDestinations,
                    ui5LocalYamlJson.server.customMiddleware[index].configuration.backend,
                    templateData,
                    messages,
                    destination,
                    firstNeoAppDestination
                );
            }
            //other backends
            ui5LocalYamlJson.server.customMiddleware[index].configuration = updateYamlBackends(
                ui5LocalYamlJson.server.customMiddleware[index].configuration,
                templateData
            );
        }
        setAppreloadPath(ui5LocalYamlJson, webappPath);
    });
    // Set webapp path
    setWebappPath(ui5LocalYamlJson, webappPath);

    cleanupBackendNullUrls(ui5LocalYamlJson);
    await updateFile(join(rootPath, TemplateFileName.UI5LocalYaml), stringify(ui5LocalYamlJson));
}

/**
 * Generate and write ui5-mock.yaml file if required
 *
 * @param config - Configuration object containing all required parameters
 */
export async function generateAndWriteUI5MockYaml(config: UI5MockYamlGenerationConfig): Promise<void> {
    const { templateData, webappPath, setUI5version, rootPath, templateRoot, hasDataSource } = config;
    if (!hasDataSource) {
        return;
    }

    // Only generate if mockdataRootPath is configured
    if (!(templateData.ui5Yaml as Partial<Ui5MockYaml>)?.mockdataRootPath) {
        return;
    }

    const ui5MockYamlContents: string = render(
        await readFile(join(templateRoot, TemplateFileName.UI5MockYaml)),
        templateData.ui5Yaml,
        { escape: escapeXML }
    );

    const ui5MockYamlJson = parse(ui5MockYamlContents);
    ui5MockYamlJson.server.customMiddleware.forEach((middleware: MiddlewareProxy, index: number) => {
        if (setUI5version && middleware?.name === FIORI_TOOLS_PROXY) {
            setProxyUI5Version(ui5MockYamlJson, templateData.ui5Yaml?.ui5Version);
        }
        setAppreloadPath(ui5MockYamlJson, webappPath);
    });
    // Set webapp path
    setWebappPath(ui5MockYamlJson, webappPath);
    await updateFile(join(rootPath, TemplateFileName.UI5MockYaml), stringify(ui5MockYamlJson));
}

/**
 * Generate all UI5 YAML files (ui5.yaml, ui5-local.yaml, ui5-mock.yaml)
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
        templateRoot,
        hasDataSource
    } = config;

    // Generate ui5.yaml
    await generateAndWriteUI5Yaml({
        templateData,
        neoappDestinations,
        messages,
        destination,
        firstNeoAppDestination,
        webappPath,
        setUI5version,
        rootPath,
        templateRoot
    });

    // Generate ui5-local.yaml
    await generateAndWriteUI5LocalYaml({
        templateData,
        neoappDestinations,
        messages,
        destination,
        firstNeoAppDestination,
        webappPath,
        rootPath,
        templateRoot
    });

    // Generate ui5-mock.yaml
    await generateAndWriteUI5MockYaml({
        templateData,
        webappPath,
        setUI5version,
        rootPath,
        templateRoot,
        hasDataSource
    });
}
