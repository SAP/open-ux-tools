import { existsSync } from 'fs';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { valid } from 'semver';
import type { Logger } from '@sap-ux/logger';
import { deleteModule, getModule, loadModuleFromProject } from './module-loader';
import { getWebappPath } from './ui5-config';
import { getMinimumUI5Version } from './info';
import { FileName, fioriToolsDirectory, moduleCacheRoot } from '../constants';
import { readJSON, writeFile } from '../file';
import type { Manifest, Package } from '../types';
import { execNpmCommand } from '../command';

const specificationDistTagPath = join(fioriToolsDirectory, FileName.SpecificationDistTags);

/**
 * Loads and return specification from project or cache.
 * 1. if package.json contains devDependency to specification, attempts to load from project.
 * 2. if not in package.json of project, attempts to load from cache.
 *
 * @param root - root path of the project/app
 * @param [options] - optional options
 * @param [options.logger] - logger instance
 * @returns - specification instance
 */
export async function getSpecification<T>(root: string, options?: { logger?: Logger }): Promise<T> {
    let specification: T;
    const logger = options?.logger;
    try {
        const packageJson = await readJSON<Package>(join(root, FileName.Package));
        if (packageJson.devDependencies?.['@sap/ux-specification']) {
            logger?.debug(`Specification found in devDependencies of project '${root}', trying to load`);
            // Early return with load module from project. If it throws an error it is not handled here.
            return loadModuleFromProject<T>(root, '@sap/ux-specification');
        }
    } catch {
        logger?.debug(`Specification not found in project '${root}', trying to load from cache`);
    }
    let distTag = 'latest';
    try {
        const webappPath = await getWebappPath(root);
        const manifest = await readJSON<Manifest>(join(webappPath, FileName.Manifest));
        const minUI5Version = getMinimumUI5Version(manifest);
        if (minUI5Version && valid(minUI5Version)) {
            const [mayor, minor] = minUI5Version.split('.');
            distTag = `UI5-${mayor}.${minor}`;
        }
    } catch (error) {
        logger?.error(`Failed to get minimum UI5 version from manifest: ${error} using 'latest'`);
    }
    try {
        specification = await getSpecificationByDistTag<T>(distTag, { logger });
        logger?.debug(`Specification loaded from cache using dist-tag '${distTag}'`);
    } catch (error) {
        logger?.error(`Failed to load specification: ${error}`);
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
    const logger = options?.logger;
    try {
        const distTagsString = await execNpmCommand(['view', '@sap/ux-specification', 'dist-tags', '--json'], {
            logger
        });
        const distTags = JSON.parse(distTagsString);
        await writeFile(specificationDistTagPath, JSON.stringify(distTags, null, 4));
        const uniqueVersions = new Set(Object.values(distTags));

        // Check if we have cached versions that are not required anymore
        const specificationCachePath = join(moduleCacheRoot, '@sap/ux-specification');
        const removeExistingVersions = existsSync(specificationCachePath)
            ? (await readdir(specificationCachePath, { withFileTypes: true }))
                  .filter((d) => d.isDirectory())
                  .filter((d) => !uniqueVersions.has(d.name))
                  .map((d) => d.name)
            : [];
        // Delete cached versions that are not required anymore
        for (const version of removeExistingVersions) {
            await deleteModule('@sap/ux-specification', version);
            logger?.debug(`Deleted unused specification module '@sap/ux-specification@${version}' from cache`);
        }
    } catch (error) {
        logger?.error(`Error refreshing specification dist-tags: ${error}`);
    }
}

/**
 * Loads and return specification from cache by dist-tag.
 *
 * @param distTag - dist-tag of the specification, like 'latest' or 'UI5-1.71'
 * @param [options] - optional options
 * @param [options.logger] - optional logger instance
 * @returns - specification instance
 */
async function getSpecificationByDistTag<T>(distTag: string, options?: { logger?: Logger }): Promise<T> {
    const logger = options?.logger;
    const version = await convertDistTagToVersion(distTag, { logger });
    const specification = await getModule<T>('@sap/ux-specification', version, { logger });
    return specification;
}

/**
 * Converts dist-tag to version.
 *
 * @param distTag - dist-tag of the specification, like 'latest' or 'UI5-1.71'
 * @param [options] - optional options
 * @param [options.logger] - optional logger instance
 * @returns - version for given dist-tag
 */
async function convertDistTagToVersion(distTag: string, options?: { logger?: Logger }): Promise<string> {
    const logger = options?.logger;
    if (!existsSync(specificationDistTagPath)) {
        logger?.debug(`Specification dist-tags not found at '${specificationDistTagPath}'. Trying to refresh.`);
        await refreshSpecificationDistTags({ logger });
    }
    const specificationDistTags = await readJSON<Record<string, string>>(specificationDistTagPath);
    const version = specificationDistTags[distTag] ?? specificationDistTags.latest;
    return version;
}
