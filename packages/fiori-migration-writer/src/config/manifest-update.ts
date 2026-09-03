/**
 * Helper functions for updating manifest.json during migration
 */

import { join } from 'node:path';
import { readJSON, updateJSON, fileExists } from '../utils/index.js';
import type { Manifest, SapAppSourceTemplate } from '../project-spec-types.js';
import { TemplateFileName } from '../index.js';
import { getSourceTemplate, MigrationError } from '../utils/common.js';
import { adaptMinUI5Version } from './manifest.js';
import type { TemplateData, Message } from '../types.js';
import { i18nText } from '../i18n.js';
import { processDataSource } from './manifest-update-helpers.js';

/**
 * Update manifest.json file with migration-specific changes
 *
 * @param rootPath - Root path of the project
 * @param webappPath - Webapp path relative to root
 * @param templateData - Template data containing project configuration
 * @param floorplan - Floor plan type
 * @param messages - Array to collect warning messages
 * @param sourceTemplateTest - Test-only source template values
 */
export async function updateManifestForMigration(
    rootPath: string,
    webappPath: string,
    templateData: TemplateData,
    floorplan: string,
    messages: Message[],
    sourceTemplateTest?: SapAppSourceTemplate
): Promise<void> {
    const manifestPath = join(webappPath, TemplateFileName.ManifestJson);
    if (!(await fileExists(join(rootPath, manifestPath)))) {
        return;
    }

    let manifestJson: Manifest;
    try {
        manifestJson = await readJSON<Manifest>(join(rootPath, manifestPath));
    } catch (e) {
        throw new MigrationError(e, TemplateFileName.ManifestJson);
    }

    let saveFile = false;

    // Update sap.app section
    if (manifestJson?.['sap.app']) {
        saveFile = updateSapAppSection(manifestJson, templateData, floorplan, sourceTemplateTest) || saveFile;
    }

    // Update sap.ui5 section
    if (manifestJson['sap.ui5']) {
        const manifestModified = adaptMinUI5Version(manifestJson);
        if (manifestModified) {
            saveFile = true;
        }
    } else {
        messages.push({
            type: 'WARNING',
            description: i18nText('MISSING_MANIFEST_UI5_SECTION')
        });
    }

    if (saveFile === true) {
        await updateJSON(join(rootPath, manifestPath), manifestJson);
    }
}

/**
 * Update sap.app section of manifest
 *
 * @param manifestJson - Manifest object to update
 * @param templateData - Template data containing project configuration
 * @param floorplan - Floor plan type
 * @param sourceTemplateTest - Test-only source template values
 * @returns true if changes were made
 */
function updateSapAppSection(
    manifestJson: Manifest,
    templateData: TemplateData,
    floorplan: string,
    sourceTemplateTest?: SapAppSourceTemplate
): boolean {
    let modified = false;

    // Update application ID if it's a placeholder
    if (manifestJson['sap.app'].id === '${project.artifactId}') {
        manifestJson['sap.app'].id = templateData.project.name || '';
        modified = true;
    }

    // Update data sources
    if (manifestJson['sap.app'].dataSources) {
        modified = updateDataSources(manifestJson, templateData) || modified;
    }

    // Update source template info for tracking
    manifestJson['sap.app'].sourceTemplate = getSourceTemplate(
        floorplan,
        Object.assign(sourceTemplateTest || {}, manifestJson['sap.app'].sourceTemplate)
    );
    modified = true; // Always save since we always add the toolsId for tracking

    return modified;
}

/**
 * Update data sources in manifest with local service paths
 *
 * @param manifestJson - Manifest object to update
 * @param templateData - Template data containing project configuration
 * @returns true if changes were made
 */
function updateDataSources(manifestJson: Manifest, templateData: TemplateData): boolean {
    let modified = false;

    if (!manifestJson['sap.app'].dataSources) {
        return false;
    }

    for (const dataSourceKey in manifestJson['sap.app'].dataSources) {
        const dataSource = manifestJson['sap.app'].dataSources[dataSourceKey];

        // Process data source using extracted helper
        const wasModified = processDataSource(dataSource, dataSourceKey, templateData);
        modified = modified || wasModified;

        // Update manifest with processed data source
        manifestJson['sap.app'].dataSources[dataSourceKey] = dataSource;
    }

    return modified;
}
