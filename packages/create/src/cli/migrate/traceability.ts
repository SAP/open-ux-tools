import { join } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import type { Logger } from '@sap-ux/logger';
import { getFioriToolsDirectory } from '@sap-ux/store';

export interface MigrationLogEntry {
    timestamp: string;
    projectPath: string;
    projectName: string;
    migrationMessages: Array<{ type: string; description: string }>;
    npmInstall?: {
        success: boolean;
        errors?: string[];
        warnings?: string[];
        securityWarnings?: string[];
    };
    migrationSuccess: boolean;
}

/**
 * Get the migration logs directory.
 *
 * @returns path to migration logs directory
 */
export function getMigrationLogsDirectory(): string {
    const fioriToolsDir = getFioriToolsDirectory();
    return join(fioriToolsDir, 'migration-logs');
}

/**
 * Ensure the migration logs directory exists.
 */
export function ensureMigrationLogsDirectory(): void {
    const logsDir = getMigrationLogsDirectory();
    if (!existsSync(logsDir)) {
        mkdirSync(logsDir, { recursive: true });
    }
}

/**
 * Generate a unique log file name for a migration.
 *
 * @param projectName - name of the migrated project
 * @param timestamp - ISO timestamp string
 * @returns log file name
 */
export function generateLogFileName(projectName: string, timestamp: string): string {
    const cleanTimestamp = timestamp.replace(/[:.]/g, '-').replace(/Z$/, '');
    return `${projectName}_${cleanTimestamp}.json`;
}

/**
 * Write migration log to file.
 *
 * @param logEntry - migration log entry
 * @param logger - optional logger for feedback
 */
export function writeMigrationLog(logEntry: MigrationLogEntry, logger?: Logger): void {
    try {
        ensureMigrationLogsDirectory();
        const logsDir = getMigrationLogsDirectory();
        const logFileName = generateLogFileName(logEntry.projectName, logEntry.timestamp);
        const logFilePath = join(logsDir, logFileName);

        writeFileSync(logFilePath, JSON.stringify(logEntry, null, 2), 'utf-8');

        logger?.info(`Migration log written to: ${logFilePath}`);
    } catch (error) {
        logger?.warn(`Failed to write migration log: ${(error as Error).message}`);
    }
}
