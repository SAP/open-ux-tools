import type { Command } from 'commander';
import { resolve, isAbsolute } from 'node:path';
import { existsSync } from 'node:fs';
import prompts from 'prompts';
import { ProjectMigrator } from '@sap-ux/fiori-migration-writer';
import { getProjectType } from '@sap-ux/project-access';
import { getLogger } from '../../tracing/index.js';

interface MigrateCommandOptions {
    destination?: string;
    sapSystemName?: string;
    hostname?: string;
    client?: string;
    ui5Version?: string;
    force?: boolean;
}

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
    if (!/^(?!-)(?!.*-$)(?!.*\.\.)(?!.*\.$)[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/.test(hostname)) {
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
 *
 * @param resolvedPath - project path
 * @param force - force flag from options
 * @returns true if migration should proceed, false otherwise
 */
async function checkForceRequired(resolvedPath: string, force: boolean): Promise<boolean> {
    const logger = getLogger();
    const projectType = await getProjectType(resolvedPath);
    const isToolsProject = projectType !== undefined && !projectType.includes('webide');

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
        const useDestination = await promptConfirm(
            'useDestination',
            'Use SAP System destination?',
            true
        );

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

    // 3. Get destination or hostname
    const { destination, hostname } = await getDestinationOrHostname(options);

    // 4. Get optional client
    const client = await getClient(options.client);

    // 5. Get UI5 version
    const ui5Version = await getUI5Version(options.ui5Version);

    // 6. Execute migration
    logger.info('Starting migration...');

    const baseUri = destination ? `/${destination}` : hostname ? `https://${hostname}` : '';
    const ui5SnapshotUrl = ui5Version ? `https://ui5.sap.com/${ui5Version}` : '';

    // Build ImportProjectInfo with client if provided
    const importProjectInfo = client
        ? {
              sapClient: client,
              rootPath: resolvedPath,
              moduleName: '',
              moduleDescription: '',
              sapux: false,
              scp: false,
              destination: destination ?? '',
              appTitle: '',
              appVersion: '',
              backends: [],
              odataVersion: 2 as any,
              webappPath: '',
              hostname: hostname ?? '',
              isFioriToolsProject: false,
              sapLibs: ''
          }
        : undefined;

    const result = await ProjectMigrator.migrate(resolvedPath, baseUri, ui5SnapshotUrl, importProjectInfo);

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
    } else {
        logger.error('✗ Migration failed');
        if (result.messages?.length) {
            result.messages.forEach((msg) => logger.error(`  ${msg.description}`));
        }
        throw new Error('Migration failed');
    }
}
