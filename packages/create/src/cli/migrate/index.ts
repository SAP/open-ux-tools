import { Command } from 'commander';
import { resolve } from 'node:path';
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
 * Execute the migration command.
 *
 * @param projectPath - path to the project to migrate
 * @param options - command options
 */
async function migrate(projectPath: string | undefined, options: MigrateCommandOptions): Promise<void> {
    const logger = getLogger();

    try {
        // 1. Get or prompt for project path
        let resolvedPath = projectPath ? resolve(projectPath) : process.cwd();

        if (!projectPath) {
            const { confirmPath } = await prompts({
                type: 'confirm',
                name: 'confirmPath',
                message: `Migrate project at current directory: ${resolvedPath}?`,
                initial: true
            });

            if (!confirmPath) {
                const { customPath } = await prompts({
                    type: 'text',
                    name: 'customPath',
                    message: 'Enter project path:',
                    validate: (value) => (value ? true : 'Project path is required')
                });
                resolvedPath = resolve(customPath);
            }
        }

        logger.info(`Migrating project at: ${resolvedPath}`);

        // 2. Check if already migrated (unless --force)
        const projectType = await getProjectType(resolvedPath);
        const isToolsProject = projectType !== undefined && !projectType.includes('webide');

        if (isToolsProject && !options.force) {
            logger.warn('Project appears to be already migrated to Fiori tools.');
            const { confirmForce } = await prompts({
                type: 'confirm',
                name: 'confirmForce',
                message: 'Force migration anyway?',
                initial: false
            });

            if (!confirmForce) {
                logger.info('Migration cancelled.');
                return;
            }
        }

        // 3. Get destination or hostname
        let destination = options.destination || options.sapSystemName;
        let hostname = options.hostname;

        if (!destination && !hostname) {
            const { useDestination } = await prompts({
                type: 'confirm',
                name: 'useDestination',
                message: 'Use SAP System destination?',
                initial: true
            });

            if (useDestination) {
                const { dest } = await prompts({
                    type: 'text',
                    name: 'dest',
                    message: 'Enter destination/SAP System name:',
                    validate: (value) => (value ? true : 'Destination is required')
                });
                destination = dest;
            } else {
                const { host } = await prompts({
                    type: 'text',
                    name: 'host',
                    message: 'Enter hostname:',
                    validate: (value) => (value ? true : 'Hostname is required')
                });
                hostname = host;
            }
        }

        // 4. Prompt for optional parameters
        let client = options.client;
        if (!client) {
            const { clientValue } = await prompts({
                type: 'text',
                name: 'clientValue',
                message: 'SAP Client (optional, press Enter to skip):',
                initial: ''
            });
            client = clientValue || undefined;
        }

        // 5. Get UI5 version (default from source project or prompt)
        let ui5Version = options.ui5Version;
        if (!ui5Version) {
            const { version } = await prompts({
                type: 'text',
                name: 'version',
                message: 'UI5 Version (optional, press Enter to use project default):',
                initial: ''
            });
            ui5Version = version || undefined;
        }

        // 6. Execute migration
        logger.info('Starting migration...');

        const baseUri = destination ? `/${destination}` : hostname ? `https://${hostname}` : '';
        const ui5SnapshotUrl = ui5Version ? `https://ui5.sap.com/${ui5Version}` : '';

        const result = await ProjectMigrator.migrate(
            resolvedPath,
            baseUri,
            ui5SnapshotUrl
        );

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
            process.exit(1);
        }
    } catch (error) {
        logger.error('Migration failed with error:');
        logger.error(error);
        process.exit(1);
    }
}
