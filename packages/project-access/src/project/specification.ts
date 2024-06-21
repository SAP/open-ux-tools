import { join } from 'path';
import { valid } from 'semver';
import { existsSync } from 'fs';
import { readdir } from 'fs/promises';
import type { Logger } from '@sap-ux/logger';
import { FileName, fioriToolsDirectory, moduleCacheRoot } from '../constants';
import { readJSON, writeFile } from '../file';
import type { Manifest } from '../types';
import { deleteModule, getModule, loadModuleFromProject } from './module-loader';
import { getWebappPath } from './ui5-config';
import { getMinimumUI5Version } from './info';
import { execNpmCommand } from '../command';

const specificationDistTagPath = join(fioriToolsDirectory, FileName.SpecificationDistTags);

/**
 * Loads and return specification from project or cache.
 * 1. attempts to load specification from project.
 * 2. if not installed in project, attempts to load from cache.
 *
 * @param options - options
 * @param options.root - root path of the project/app.
 * @param [options.logger] - logger instance
 * @returns - specification instance
 */
export async function getSpecification<T>(options: { root: string; logger?: Logger }): Promise<T> {
    let specification: T;
    try {
        specification = await loadModuleFromProject<T>(options.root, '@sap/ux-specification');
        if (specification) {
            // Early return if specification is found in project
            return specification;
        }
    } catch {
        options.logger?.debug(`Specification not found in project '${options.root}', trying to load from cache`);
    }
    let distTag = 'latest';
    try {
        const webappPath = await getWebappPath(options.root);
        const manifest = await readJSON<Manifest>(join(webappPath, FileName.Manifest));
        const minUI5Version = getMinimumUI5Version(manifest);
        if (minUI5Version && valid(minUI5Version)) {
            const [mayor, minor] = minUI5Version.split('.');
            distTag = `UI5-${mayor}.${minor}`;
        }
    } catch (error) {
        options.logger?.error(`Failed to get minimum UI5 version from manifest: ${error} using 'latest'`);
    }
    try {
        specification = await getSpecificationByDistTag<T>(distTag);
    } catch (error) {
        options.logger?.error(`Failed to load specification: ${error}`);
        throw new Error(`Failed to load specification: ${error}`);
    }
    return specification;
}

/**
 * Refreshes the specification dist-tags cache. Also cleans specification modules in cache that are not required anymore.
 *
 * @param [options] - optional options, like logger
 * @param [options.logger] - logger instance
 */
export async function refreshSpecificationDistTags(options?: { logger?: Logger }): Promise<void> {
    try {
        const distTagsString = await execNpmCommand(['view', '@sap/ux-specification', 'dist-tags', '--json']);
        const distTags = JSON.parse(distTagsString);
        await writeFile(specificationDistTagPath, JSON.stringify(distTags, null, 4));
        const uniqueVersions = new Set(Object.values(distTags));

        // Check if we have cached versions that are not required anymore
        const specificationCachePath = join(moduleCacheRoot, '@sap/ux-specification');
        const removeExistingVersions = (await readdir(specificationCachePath, { withFileTypes: true }))
            .filter((d) => d.isDirectory())
            .filter((d) => !uniqueVersions.has(d.name))
            .map((d) => d.name);
        // Delete cached versions that are not required anymore
        for (const version of removeExistingVersions) {
            await deleteModule('@sap/ux-specification', version);
            options?.logger?.debug(`Deleted specification module '@sap/ux-specification@${version}' from cache`);
        }
    } catch (error) {
        options?.logger?.error(`Error refreshing specification dist-tags: ${error}`);
    }
}

/**
 * Loads and return specification from cache by dist-tag.
 *
 * @param distTag - dist-tag of the specification, like 'latest' or 'UI5-1.71'
 * @returns - specification instance
 */
async function getSpecificationByDistTag<T>(distTag: string): Promise<T> {
    const version = await convertDistTagToVersion(distTag);
    const specification = await getModule<T>('@sap/ux-specification', version);
    return specification;
}

/**
 * Converts dist-tag to version.
 *
 * @param distTag - dist-tag of the specification, like 'latest' or 'UI5-1.71'
 * @returns - version for given dist-tag
 */
async function convertDistTagToVersion(distTag: string): Promise<string> {
    if (!existsSync(specificationDistTagPath)) {
        await refreshSpecificationDistTags();
    }
    const specificationDistTags = await readJSON<Record<string, string>>(specificationDistTagPath);
    const version = specificationDistTags[distTag] ?? specificationDistTags.latest;
    return version;
}
