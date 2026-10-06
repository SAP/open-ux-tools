import type { Command } from 'commander';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import prompts from 'prompts';
import { ProjectAccess, ProjectMigrator, initI18n } from '@sap-ux/fiori-migration-writer';
import { DestinationProxyType, isAppStudio, listDestinations, type Destination } from '@sap-ux/btp-utils';
import { getService, type BackendSystem, type BackendSystemKey } from '@sap-ux/store';
import { runNpmInstallCommand } from '../../common/index.js';
import { getLogger } from '../../tracing/index.js';
import { findSystemByUrl } from '../utils/system-lookup.js';

interface MigrateCommandOptions {
    destination?: string;
    sapSystemName?: string;
    hostname?: string;
    client?: string;
    ui5Version?: string;
    force?: boolean;
    skipInstall?: boolean;
}

type MigrationSystem = Pick<BackendSystem, 'name' | 'url' | 'client'> & { scp: boolean };

/**
 * Validate a path to prevent directory traversal attacks.
 *
 * @param path - path to validate
 * @returns validated absolute path
 * @throws Error if path contains unsafe characters or doesn't exist
 */
function validatePath(path: string): string {
    const resolved = resolve(path);
    // Reject control characters and shell metacharacters
    if (/[\0\r\n`$|&;<>]/.test(resolved)) {
        throw new Error('Path contains unsafe characters');
    }
    // Ensure it's an existing directory
    if (!existsSync(resolved)) {
        throw new Error(`Path does not exist: ${path}`);
    }
    return resolved;
}

/**
 * Validate a destination/system name to prevent injection attacks.
 *
 * @param destination - destination name to validate
 * @returns validated destination
 * @throws Error if destination contains invalid characters
 */
function validateDestination(destination: string): string {
    // Allow alphanumeric, underscores, hyphens (typical SAP destination/system names)
    if (!/^[a-zA-Z0-9_-]+$/.test(destination)) {
        throw new Error('Destination name must contain only letters, numbers, hyphens, and underscores');
    }
    return destination;
}

/**
 * Validate a hostname to prevent URL injection.
 *
 * @param hostname - hostname to validate
 * @returns validated hostname
 * @throws Error if hostname contains unsafe characters
 */
function validateHostname(hostname: string): string {
    // RFC-compliant hostname: alphanumeric and hyphens, segments separated by dots
    // No leading/trailing hyphens in segments, no consecutive dots
    if (
        !/^(?!-)(?!.*-$)(?!.*\.\.)(?!.*\.$)[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/.test(
            hostname
        )
    ) {
        throw new Error('Invalid hostname format');
    }
    return hostname;
}

/**
 * Validate a SAP client number.
 *
 * @param client - client number to validate
 * @returns validated client
 * @throws Error if client is not a 3-digit number
 */
function validateClient(client: string): string {
    // SAP clients are 3-digit numbers (000-999)
    if (!/^\d{3}$/.test(client)) {
        throw new Error('SAP client must be a 3-digit number (e.g., 100)');
    }
    return client;
}

/**
 * Validate a UI5 version string to prevent URL injection.
 *
 * @param version - version string to validate
 * @returns validated version
 * @throws Error if version contains unsafe characters
 */
function validateUI5Version(version: string): string {
    // Allow semantic version format: digits, dots, optional snapshot suffix
    if (!/^[0-9]+\.[0-9]+\.[0-9]+(-snapshot)?$/.test(version)) {
        throw new Error('UI5 version must follow semantic versioning format (e.g., 1.120.0)');
    }
    return version;
}

/**
 * Helper to create a required text validation function.
 *
 * @param fieldName - name of the field for error message
 * @returns validation function
 */
function createRequiredValidator(fieldName: string): (value: string) => boolean | string {
    return (value: string) => (value ? true : `${fieldName} is required`);
}

/**
 * Helper to prompt for a required text input.
 *
 * @param name - prompt name
 * @param message - prompt message
 * @param fieldName - field name for validation error
 * @returns user input
 */
async function promptRequiredText(name: string, message: string, fieldName: string): Promise<string> {
    const response = await prompts({
        type: 'text',
        name,
        message,
        validate: createRequiredValidator(fieldName)
    });
    if (response[name] === undefined) {
        throw new Error('Operation cancelled by user');
    }
    return response[name] as string;
}

/**
 * Helper to prompt for confirmation.
 *
 * @param name - prompt name
 * @param message - prompt message
 * @param initial - initial value
 * @returns confirmation response
 */
async function promptConfirm(name: string, message: string, initial: boolean): Promise<boolean> {
    const response = await prompts({ type: 'confirm', name, message, initial });
    if (response[name] === undefined) {
        throw new Error('Operation cancelled by user');
    }
    return response[name] as boolean;
}

/**
 * Add the 'migrate' command to the provided commander program.
 *
 * @param program - commander program to add the command to
 */
export function addMigrateCommand(program: Command): void {
    program
        .command('migrate [project-path]')
        .description('Migrate legacy WebIDE Fiori project to modern Fiori tools format')
        .option('-d, --destination <name>', 'SAP System destination name')
        .option('-s, --sap-system-name <name>', 'SAP System name (alias for destination)')
        .option('-H, --hostname <host>', 'Hostname (required if destination not provided)')
        .option('-c, --client <client>', 'SAP Client (optional)')
        .option('-u, --ui5-version <version>', 'UI5 version (defaults to source project version)')
        .option('-f, --force', 'Force migration even if project is already a Fiori tools project')
        .option('-n, --skip-install', 'Skip the `npm install` step after migration')
        .action(async (projectPath: string | undefined, options: MigrateCommandOptions) => {
            await migrate(projectPath, options);
        });
}

/**
 * Get project path from user or use provided path.
 *
 * @param projectPath - optional project path from command line
 * @returns resolved project path
 */
async function getProjectPath(projectPath: string | undefined): Promise<string> {
    let resolvedPath = projectPath ? validatePath(projectPath) : process.cwd();

    if (!projectPath) {
        const confirmPath = await promptConfirm(
            'confirmPath',
            `Migrate project at current directory: ${resolvedPath}?`,
            true
        );

        if (!confirmPath) {
            const customPath = await promptRequiredText('customPath', 'Enter project path:', 'Project path');
            resolvedPath = validatePath(customPath);
        }
    }

    return resolvedPath;
}

/**
 * Check if project needs force flag for migration.
 * Uses package.json devDependencies to detect Fiori tools projects.
 *
 * @param resolvedPath - project path
 * @param force - force flag from options
 * @returns true if migration should proceed, false otherwise
 */
async function checkForceRequired(resolvedPath: string, force: boolean): Promise<boolean> {
    const logger = getLogger();

    // Check for Fiori tools indicators in package.json
    let isToolsProject = false;
    try {
        const { readFileSync } = await import('node:fs');
        const packageJsonPath = resolve(resolvedPath, 'package.json');
        if (existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
            const devDeps = packageJson.devDependencies || {};
            // Fiori tools projects have @sap/ux-* or @ui5/* dev dependencies
            isToolsProject = Object.keys(devDeps).some((dep) => dep.startsWith('@sap/ux-') || dep.startsWith('@ui5/'));
        }
    } catch {
        // If we can't read package.json, assume not a tools project
    }

    if (isToolsProject && !force) {
        logger.warn('Project appears to be already migrated to Fiori tools.');
        const confirmForce = await promptConfirm('confirmForce', 'Force migration anyway?', false);

        if (!confirmForce) {
            logger.info('Migration cancelled.');
            return false;
        }
    }

    return true;
}

/**
 * Get destination or hostname from user or options.
 *
 * @param options - command options
 * @returns object with destination and hostname
 */
async function getDestinationOrHostname(options: MigrateCommandOptions): Promise<{
    destination?: string;
    hostname?: string;
}> {
    let destination = options.destination ?? options.sapSystemName;
    let hostname = options.hostname ? validateHostname(options.hostname) : undefined;

    // Validate destination if provided via CLI
    if (destination) {
        destination = validateDestination(destination);
    }

    if (!destination && !hostname) {
        const useDestination = await promptConfirm('useDestination', 'Use SAP System destination?', true);

        if (useDestination) {
            const dest = await promptRequiredText('dest', 'Enter destination/SAP System name:', 'Destination');
            destination = validateDestination(dest);
        } else {
            const host = await promptRequiredText('host', 'Enter hostname:', 'Hostname');
            hostname = validateHostname(host);
        }
    }

    return { destination, hostname };
}

/**
 * Get optional client parameter.
 *
 * @param optionClient - client from command options
 * @returns client value or undefined
 */
async function getClient(optionClient?: string): Promise<string | undefined> {
    if (optionClient) {
        return validateClient(optionClient);
    }

    const response = await prompts({
        type: 'text',
        name: 'clientValue',
        message: 'SAP Client (optional, press Enter to skip):',
        initial: ''
    });

    const client = response.clientValue as string;
    return client ? validateClient(client) : undefined;
}

/**
 * Get UI5 version parameter.
 *
 * @param optionVersion - UI5 version from command options
 * @returns UI5 version or undefined
 */
async function getUI5Version(optionVersion?: string): Promise<string | undefined> {
    if (optionVersion) {
        return validateUI5Version(optionVersion);
    }

    const response = await prompts({
        type: 'text',
        name: 'version',
        message: 'UI5 Version (optional, press Enter to use project default):',
        initial: ''
    });

    const version = response.version as string;
    return version ? validateUI5Version(version) : undefined;
}

/**
 * Resolve a legacy project's backend to a saved system or BAS destination.
 *
 * @param projectPath - legacy project root
 * @returns matched system, if available
 */
async function findMigrationSystem(projectPath: string): Promise<MigrationSystem | undefined> {
    const logger = getLogger();
    try {
        const { projectInfo } = await ProjectAccess.getProjectInfo(projectPath);
        if (isAppStudio()) {
            return await findBASDestination(projectInfo.destination, projectInfo.hostname);
        }

        if (!projectInfo.hostname) {
            return undefined;
        }

        const service = await getService<BackendSystem, BackendSystemKey>({ entityName: 'system', logger });
        const savedSystem = await findSystemByUrl(projectInfo.hostname, projectInfo.sapClient || undefined, service);
        return savedSystem ? { ...savedSystem, scp: false } : undefined;
    } catch (error) {
        logger.debug(`Unable to resolve a migration system: ${(error as Error).message}`);
        return undefined;
    }
}

/**
 * Match the legacy project backend to a BAS destination.
 *
 * @param destinationName - destination parsed from the legacy project
 * @param hostname - backend hostname parsed from the legacy project
 * @returns matching BAS destination, if available
 */
async function findBASDestination(
    destinationName: string | undefined,
    hostname: string | undefined
): Promise<MigrationSystem | undefined> {
    const destinations = await listDestinations();
    const systems = Object.values(destinations).map((destination) => toMigrationSystem(destination));
    const destinationMatch = destinationName ? systems.find((system) => system.name === destinationName) : undefined;
    if (destinationMatch) {
        return destinationMatch;
    }

    if (!hostname) {
        return undefined;
    }

    try {
        const sourceOrigin = new URL(hostname).origin;
        const matches = systems.filter((system) => new URL(system.url).origin === sourceOrigin);
        if (matches.length === 1) {
            return matches[0];
        }
        if (matches.length > 1) {
            const answer = await prompts({
                type: 'select',
                name: 'system',
                message: 'Select the SAP Business Application Studio destination:',
                choices: matches.map((system) => ({
                    title: `${system.name} (${system.client || 'default client'})`,
                    value: system
                }))
            });
            return answer.system as MigrationSystem | undefined;
        }
    } catch {
        // Invalid source or destination URLs cannot be matched safely.
    }

    return undefined;
}

function toMigrationSystem(destination: Destination): MigrationSystem {
    return {
        name: destination.Name,
        url: destination.Host,
        client: destination['sap-client'] || undefined,
        scp: destination.ProxyType === DestinationProxyType.ON_PREMISE
    };
}

/**
 * Execute the migration command.
 *
 * @param projectPath - path to the project to migrate
 * @param options - command options
 */
async function migrate(projectPath: string | undefined, options: MigrateCommandOptions): Promise<void> {
    const logger = getLogger();

    // 1. Get or prompt for project path
    const resolvedPath = await getProjectPath(projectPath);
    logger.info(`Migrating project at: ${resolvedPath}`);

    // 2. Check if force flag is required
    const shouldProceed = await checkForceRequired(resolvedPath, options.force ?? false);
    if (!shouldProceed) {
        return;
    }

    const matchedSystem = await findMigrationSystem(resolvedPath);

    // 3. Get destination or hostname
    const resolvedOptions = {
        ...options,
        destination: options.destination ?? options.sapSystemName ?? matchedSystem?.name,
        client: options.client ?? matchedSystem?.client
    };
    const { destination, hostname } = await getDestinationOrHostname(resolvedOptions);

    // 4. Get optional client
    const client = await getClient(resolvedOptions.client);

    // 5. Get UI5 version
    const ui5Version = await getUI5Version(options.ui5Version);
    const sapClient =
        client ?? (destination ? ProjectAccess.getClientFromDestinationName(destination) || undefined : undefined);

    // 6. Execute migration
    logger.info('Starting migration...');

    // Set baseUri: use destination route or construct from hostname
    let baseUri = destination ? `/${destination}` : '';
    if (hostname) {
        baseUri = `https://${hostname}`;
    } else if (!options.destination && !options.sapSystemName && matchedSystem?.url) {
        baseUri = matchedSystem.url;
    }
    const ui5SnapshotUrl = ui5Version ? `https://ui5.sap.com/${ui5Version}` : '';

    // Initialize i18n for proper error messages
    await initI18n();

    // Load project info first, then merge CLI overrides
    // Pass only the override fields so ProjectMigrator loads full metadata and merges
    const result = await ProjectMigrator.migrate(
        resolvedPath,
        baseUri,
        ui5SnapshotUrl,
        // Only override specific connection fields - ProjectMigrator will fetch and merge
        sapClient || destination || hostname
            ? {
                  ...(sapClient && { sapClient }),
                  ...(destination && { destination }),
                  ...(hostname && { hostname }),
                  ...(!hostname && matchedSystem?.url && { hostname: matchedSystem.url }),
                  ...(!options.destination && !options.sapSystemName && matchedSystem && { scp: matchedSystem.scp })
              }
            : undefined
    );

    // Commit mem-fs-editor changes to disk
    logger.info('Writing files to disk...');
    await new Promise<void>((resolve, reject) => {
        result.fs.commit((err) => {
            if (err) {
                logger.error(`Failed to write files: ${err.message}`);
                reject(err);
            } else {
                resolve();
            }
        });
    });

    if (result.result) {
        logger.info('✓ Migration completed successfully!');
        if (result.messages?.length) {
            logger.info('\nMessages:');
            result.messages.forEach((msg) => {
                const logMessage = `  ${msg.type}: ${msg.description}`;
                if (msg.type === 'ERROR') {
                    logger.error(logMessage);
                } else if (msg.type === 'WARNING') {
                    logger.warn(logMessage);
                } else {
                    logger.info(logMessage);
                }
            });
        }

        if (options.skipInstall) {
            logger.warn('`npm install` was skipped. Install project dependencies before running the application.');
        } else {
            logger.info('Installing project dependencies...');
            runNpmInstallCommand(resolvedPath, [], { logger });
        }
    } else {
        logger.error('✗ Migration failed');
        if (result.messages?.length) {
            result.messages.forEach((msg) => logger.error(`  ${msg.description}`));
        }
        throw new Error('Migration failed');
    }
}
