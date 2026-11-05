import { isAppStudio } from '@sap-ux/btp-utils';
import type { AbapTarget, AbapDeployConfig } from '../types/index.js';
import { isUrlTarget } from '@sap-ux/system-access';
import type { BspConfig } from '@sap-ux/axios-extension';
import type { Logger } from '@sap-ux/logger';
import { UI5Config } from '@sap-ux/ui5-config';
import { readFile } from 'node:fs/promises';

/**
 * Clones the given config and removes secrets so that it can be printed to a log file.
 *
 * @param config - config object
 * @returns config object that can be logged
 */
export function getConfigForLogging(
    config: AbapDeployConfig
): AbapDeployConfig | (Omit<AbapDeployConfig, 'credentials'> & { credentials: 'hidden' }) {
    if (config.credentials?.password) {
        return {
            ...config,
            credentials: 'hidden'
        };
    } else {
        return config;
    }
}

/**
 * Helper function for throwing a missing property error.
 *
 * @param property Invalid missing property
 */
export function throwConfigMissingError(property: string): void {
    throw new Error(`Invalid deployment configuration. Property ${property} is missing.`);
}

/**
 * Validate the given target config. If anything mandatory is missing throw an error.
 *
 * @param target - target configuration to be validated
 * @returns reference to the given target config
 */
function validateTarget(target: AbapTarget): AbapTarget {
    if (isUrlTarget(target)) {
        if (target.client) {
            target.client = (target.client + '').padStart(3, '0');
        }
    } else if (!target.destination) {
        throwConfigMissingError(isAppStudio() ? 'target-destination' : 'target-url');
    }
    return target;
}

/**
 * Type checking the config object.
 *
 * @param config - config to be checked
 * @returns true if it is of type BSP config
 */
export function isBspConfig(config: Partial<BspConfig>): config is BspConfig {
    return (config as BspConfig).name !== undefined;
}

/**
 * Validate the given config. If anything mandatory is missing throw an error.
 *
 * @param config - the config to be validated
 * @param logger Logger used by deploy tooling
 * @returns reference to the given config
 */
export function validateConfig(config: AbapDeployConfig | undefined, logger?: Logger): AbapDeployConfig {
    if (!config) {
        throw new Error('The deployment configuration is missing.');
    }

    if (config.app.package && config.app.package !== config.app.package.toUpperCase()) {
        const normalized = config.app.package.toUpperCase();
        logger?.warn(
            `Package name '${config.app.package}' was normalized to '${normalized}'. Lowercase package names may cause deployment failures.`
        );
        config.app.package = normalized;
    }

    if (config.target) {
        config.target = validateTarget(config.target);
    } else {
        throwConfigMissingError('target');
    }
    if (!config.app) {
        throwConfigMissingError('app');
    }

    return config;
}

/**
 * Reads builder.resources.excludes from the deploy config file and returns the patterns verbatim.
 * Returns an empty array if the section is absent or the file cannot be read.
 *
 * @param deployConfigPath - path to the ui5-deploy.yaml file
 * @param logger - optional logger; a debug message is emitted when the file is simply absent,
 *                 a warning when it exists but cannot be parsed
 * @returns the raw exclude patterns e.g. ['/test/**', '/localService/**']
 */
export async function readBuilderExcludes(deployConfigPath: string, logger?: Logger): Promise<string[]> {
    try {
        const content = await readFile(deployConfigPath, 'utf-8');
        const ui5Config = await UI5Config.newInstance(content);
        return ui5Config.getBuilderResourceExcludes();
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (isFileNotFoundError(e)) {
            logger?.debug(`No builder excludes read from ${deployConfigPath}: ${message}`);
        } else {
            logger?.warn(`Could not read builder excludes from ${deployConfigPath}: ${message}`);
        }
        return [];
    }
}

/**
 * Checks whether the given error represents a missing file (ENOENT).
 *
 * @param e - caught error of unknown type
 * @returns true if the error carries the ENOENT code
 */
function isFileNotFoundError(e: unknown): boolean {
    // `code` is read only after confirming it exists on the object, so the cast is safe.
    return typeof e === 'object' && e !== null && 'code' in e && (e as { code?: string }).code === 'ENOENT';
}

/**
 * Converts an exclude pattern into an anchored RegExp. Patterns use glob semantics, not regex:
 * regex metacharacters (including `.`) are matched literally, `*` matches within a single path
 * segment, and `**` matches across segments. A pattern ending in `/` or a wildcard is treated as
 * an open-ended (directory/prefix) match; any other pattern is anchored to the end so a file glob
 * such as `/Component.js` does not also match `/Component.js.bak`.
 *
 * @param pattern - exclude pattern e.g. '/test/', '/test/**', '/**\/*.map', '/Component.js'
 * @returns a RegExp anchored at the archive-relative path root (leading slash optional)
 */
export function excludePatternToRegExp(pattern: string): RegExp {
    const body = pattern.startsWith('/') ? pattern.slice(1) : pattern;
    const openEnded = body.endsWith('*') || body.endsWith('/');
    const globstarDir = '\u0000'; // '**/' — zero or more leading/intermediate path segments
    const globstar = '\u0001'; // '**' — any characters across segments
    const source = body
        .replaceAll('**/', globstarDir) // '**/' may match zero segments, so the '/' is optional
        .replaceAll('**', globstar) // remaining globstar (no trailing slash)
        .replace(/[.+^${}()|[\]\\?]/g, String.raw`\$&`) // escape regex metacharacters (keep `*` and `/`)
        .replaceAll('*', '[^/]*') // single star stays within a segment
        .split(globstarDir)
        .join('(?:.*/)?')
        .split(globstar)
        .join('.*');
    return new RegExp(openEnded ? `^/?${source}` : `^/?${source}$`);
}

/**
 * Determines whether an archive-relative path matches any of the given exclude patterns.
 * Shared by both the CLI and UI5-task archive builders so a single matching engine is used.
 *
 * @param path - archive-relative path e.g. 'test/change_loader.js'
 * @param exclude - exclude patterns (literal prefixes or globs)
 * @returns true if the path should be excluded from the archive
 */
export function isExcluded(path: string, exclude: string[]): boolean {
    return exclude.some((pattern) => excludePatternToRegExp(pattern).test(path));
}

/**
 * Regex-only constructs that carry no special meaning under the glob semantics used by
 * {@link excludePatternToRegExp}. An explicit exclude entry containing one of these was most
 * likely authored as a regular expression (the pre-glob behaviour) and is now matched
 * literally, so its presence indicates a behavioural change worth surfacing. Kept intentionally
 * narrow (backslash escape, start/end anchors) to avoid flagging valid globs such as `*.*`.
 */
const LEGACY_REGEX_HINTS = [/\\/, /^\^/, /\$$/];

/**
 * Warns for each explicit exclude pattern that looks like a legacy regular expression rather than
 * a glob/path pattern, since exclude matching changed from regex to glob semantics. Builder-derived
 * globs are legitimately glob patterns and must not be passed here.
 *
 * @param patterns - explicit configuration.exclude / CLI --exclude entries
 * @param logger - optional logger; warnings are only emitted when provided
 */
export function warnOnLegacyRegexExcludes(patterns: string[], logger?: Logger): void {
    if (!logger) {
        return;
    }
    for (const pattern of patterns) {
        if (LEGACY_REGEX_HINTS.some((hint) => hint.test(pattern))) {
            logger.warn(
                `Exclude pattern '${pattern}' looks like a regular expression. Exclude patterns now use glob ` +
                    `semantics (e.g. '/test/**', '/**/*.map') and regex metacharacters are matched literally. ` +
                    `See the deploy-tooling README to migrate.`
            );
        }
    }
}
