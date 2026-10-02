import { ProjectMigrator, initI18n, isFioriToolsProject } from '@sap-ux/fiori-migration-writer';
import type { Message, ImportProjectInfo } from '@sap-ux/fiori-migration-writer';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { logger } from '../utils/index.js';

export interface MigrateProjectInput {
    projectPath: string;
    destination?: string;
    hostname?: string;
    client?: string;
    ui5Version?: string;
    force?: boolean;
}

export interface FollowOnAction {
    type: 'fetchMetadata' | 'cleanupBackends' | 'updateDependencies' | 'info';
    description: string;
    priority: 'high' | 'medium' | 'low';
    params?: Record<string, unknown>;
}

export interface MigrateProjectOutput {
    status: 'Success' | 'Warning' | 'Error';
    message: string;
    projectPath: string;
    messages: Array<{
        type: 'ERROR' | 'WARNING' | 'SUCCESS';
        description: string;
    }>;
    followOnActions: FollowOnAction[];
    summary: {
        filesModified: number;
        warnings: number;
        errors: number;
    };
    timestamp: string;
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
 * Parse migration messages to determine follow-on actions.
 *
 * @param messages - migration messages
 * @returns array of follow-on actions
 */
function analyzeMessages(messages: Message[]): FollowOnAction[] {
    const actions: FollowOnAction[] = [];
    const actionSet = new Set<string>();

    for (const msg of messages) {
        const description = msg.description.toLowerCase();

        // Suggest fetching metadata if service issues detected
        if (
            (description.includes('metadata') || description.includes('service') || description.includes('edmx')) &&
            !actionSet.has('fetchMetadata')
        ) {
            actions.push({
                type: 'fetchMetadata',
                description: 'Consider fetching OData metadata to resolve service configuration issues',
                priority: 'high',
                params: { reason: msg.description, messageType: msg.type }
            });
            actionSet.add('fetchMetadata');
        }

        // Suggest backend cleanup if multiple backends or configuration issues found
        if (
            (description.includes('backend') ||
                description.includes('ui5.yaml') ||
                description.includes('proxy') ||
                description.includes('destination')) &&
            !actionSet.has('cleanupBackends')
        ) {
            actions.push({
                type: 'cleanupBackends',
                description: 'Review and clean up backend configuration in ui5.yaml or ui5-local.yaml',
                priority: 'medium',
                params: { reason: msg.description, messageType: msg.type }
            });
            actionSet.add('cleanupBackends');
        }

        // Suggest dependency updates if version issues
        if (
            (description.includes('dependency') ||
                description.includes('version') ||
                description.includes('package.json') ||
                description.includes('outdated')) &&
            !actionSet.has('updateDependencies')
        ) {
            actions.push({
                type: 'updateDependencies',
                description: 'Consider updating project dependencies to latest compatible versions',
                priority: 'low',
                params: { reason: msg.description, messageType: msg.type }
            });
            actionSet.add('updateDependencies');
        }

        // Add general info for important messages
        if (msg.type === 'WARNING' && !actionSet.has(`info-${msg.description.slice(0, 30)}`)) {
            actions.push({
                type: 'info',
                description: msg.description,
                priority: 'medium',
                params: { messageType: msg.type }
            });
            actionSet.add(`info-${msg.description.slice(0, 30)}`);
        }
    }

    return actions;
}

/**
 * Migrate a Fiori project from WebIDE to modern Fiori tools format.
 *
 * @param params - migration parameters
 * @returns migration result with messages and suggested follow-on actions
 */
export async function migrateFioriProject(params: MigrateProjectInput): Promise<MigrateProjectOutput> {
    const timestamp = new Date().toISOString();

    try {
        // Validate and sanitize inputs
        const projectPath = validatePath(params.projectPath);
        const destination = params.destination ? validateDestination(params.destination) : undefined;
        const hostname = params.hostname ? validateHostname(params.hostname) : undefined;
        const client = params.client ? validateClient(params.client) : undefined;
        const ui5Version = params.ui5Version ? validateUI5Version(params.ui5Version) : undefined;

        logger.info(`Starting migration for project: ${projectPath}`);

        // Check if project is already migrated (unless force is true)
        if (!params.force) {
            const isAlreadyMigrated = await isFioriToolsProject(projectPath);

            if (isAlreadyMigrated) {
                return {
                    status: 'Warning',
                    message: 'Project appears to be already migrated to Fiori tools. Use force=true to re-migrate.',
                    projectPath,
                    messages: [
                        {
                            type: 'WARNING',
                            description:
                                'Project already has Fiori tools markers (ui5.yaml, package.json). Already migrated.'
                        }
                    ],
                    followOnActions: [],
                    summary: {
                        filesModified: 0,
                        warnings: 1,
                        errors: 0
                    },
                    timestamp
                };
            }
        }

        // Build base URI
        let baseUri = destination ? `/${destination}` : '';
        if (hostname) {
            baseUri = `https://${hostname}`;
        }

        // Build UI5 snapshot URL
        const ui5SnapshotUrl = ui5Version ? `https://ui5.sap.com/${ui5Version}` : '';

        // Build backend config override as partial ImportProjectInfo
        const partialProjectInfo: Partial<ImportProjectInfo> | undefined =
            client || destination || hostname
                ? {
                      ...(client && { sapClient: client }),
                      ...(destination && { destination }),
                      ...(hostname && { hostname })
                  }
                : undefined;

        // Execute migration
        logger.info('Executing migration...');

        // Initialize i18n for proper error messages
        await initI18n();

        const result = await ProjectMigrator.migrate(
            projectPath,
            baseUri,
            ui5SnapshotUrl,
            partialProjectInfo as ImportProjectInfo | undefined,
            undefined, // vscode
            false // internalToggle - keep disabled for public API
        );

        // Analyze messages for follow-on actions
        const followOnActions = result.messages ? analyzeMessages(result.messages) : [];

        // Calculate summary
        // Note: filesModified is not accurately tracked by message types
        // ProjectMigrator returns result:true on success but doesn't emit per-file SUCCESS messages
        const messages = result.messages || [];
        const summary = {
            filesModified: result.result ? 1 : 0, // Indicate migration occurred (actual file count not available)
            warnings: messages.filter((m) => m.type === 'WARNING').length,
            errors: messages.filter((m) => m.type === 'ERROR').length
        };

        if (result.result) {
            logger.info('✓ Migration completed successfully');
            return {
                status: summary.errors > 0 ? 'Warning' : 'Success',
                message:
                    summary.errors > 0
                        ? 'Migration completed with errors. Review messages for details.'
                        : 'Migration completed successfully',
                projectPath,
                messages,
                followOnActions,
                summary,
                timestamp
            };
        } else {
            logger.error('✗ Migration failed');
            return {
                status: 'Error',
                message: 'Migration failed. Review error messages for details.',
                projectPath,
                messages,
                followOnActions,
                summary,
                timestamp
            };
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Migration error: ${errorMessage}`);

        return {
            status: 'Error',
            message: `Migration failed: ${errorMessage}`,
            projectPath: params.projectPath,
            messages: [
                {
                    type: 'ERROR',
                    description: errorMessage
                }
            ],
            followOnActions: [],
            summary: {
                filesModified: 0,
                warnings: 0,
                errors: 1
            },
            timestamp
        };
    }
}
