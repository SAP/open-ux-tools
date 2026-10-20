import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const testHomeDir = join(tmpdir(), 'test-fiori-tools-traceability');
jest.unstable_mockModule('@sap-ux/store', () => ({
    getFioriToolsDirectory: () => join(testHomeDir, '.fioritools')
}));

const { getMigrationLogsDirectory, ensureMigrationLogsDirectory, generateLogFileName, writeMigrationLog } =
    await import('../../../src/cli/migrate/traceability.js');

const { getFioriToolsDirectory } = await import('@sap-ux/store');

import type { MigrationLogEntry } from '../../../src/cli/migrate/traceability.js';

describe('Migration Traceability', () => {
    beforeEach(() => {
        // Clean up test directory before each test
        if (existsSync(testHomeDir)) {
            rmSync(testHomeDir, { recursive: true, force: true });
        }
    });

    afterEach(() => {
        // Clean up test directory after each test
        if (existsSync(testHomeDir)) {
            rmSync(testHomeDir, { recursive: true, force: true });
        }
    });

    test('getFioriToolsDirectory should return correct path', () => {
        const fioriToolsDir = getFioriToolsDirectory();
        expect(fioriToolsDir).toBe(join(testHomeDir, '.fioritools'));
    });

    test('getMigrationLogsDirectory should return correct path', () => {
        const logsDir = getMigrationLogsDirectory();
        expect(logsDir).toBe(join(testHomeDir, '.fioritools', 'migration-logs'));
    });

    test('ensureMigrationLogsDirectory should create directory', () => {
        const logsDir = getMigrationLogsDirectory();
        expect(existsSync(logsDir)).toBe(false);

        ensureMigrationLogsDirectory();

        expect(existsSync(logsDir)).toBe(true);
    });

    test('generateLogFileName should create valid filename', () => {
        const projectName = 'my-project';
        const timestamp = '2026-10-15T10:30:45.123Z';
        const fileName = generateLogFileName(projectName, timestamp);

        expect(fileName).toMatch(/^my-project_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}\.json$/);
        expect(fileName).toContain('my-project');
    });

    test('writeMigrationLog should create JSON log file', () => {
        const logEntry: MigrationLogEntry = {
            timestamp: '2026-10-15T10:30:45.123Z',
            projectPath: '/path/to/my-project',
            projectName: 'my-project',
            migrationMessages: [
                { type: 'INFO', description: 'Migration started' },
                { type: 'WARNING', description: 'Some warning' }
            ],
            npmInstall: {
                success: true,
                warnings: ['npm WARN deprecated package@1.0.0'],
                securityWarnings: ['found 2 vulnerabilities']
            },
            migrationSuccess: true
        };

        const mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn()
        };

        writeMigrationLog(logEntry, mockLogger as any);

        const logsDir = getMigrationLogsDirectory();
        expect(existsSync(logsDir)).toBe(true);

        // Check that a log file was created
        const files = readdirSync(logsDir);
        expect(files).toHaveLength(1);
        expect(files[0]).toMatch(/^my-project_.*\.json$/);

        // Verify log file contents
        const logFilePath = join(logsDir, files[0]);
        const logContent = JSON.parse(readFileSync(logFilePath, 'utf-8'));
        expect(logContent).toEqual(logEntry);

        // Verify logger was called
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Migration log written to'));
    });

    test('writeMigrationLog should warn when writing the log fails', () => {
        const logEntry: MigrationLogEntry = {
            timestamp: '2026-10-15T10:30:45.123Z',
            projectPath: '/path/to/my-project',
            projectName: 'my-project',
            migrationMessages: [],
            migrationSuccess: true
        };

        const mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn()
        };

        // Create a file where the logs directory should be so that mkdirSync/writeFileSync fails.
        const fioriToolsDir = getFioriToolsDirectory();
        mkdirSync(fioriToolsDir, { recursive: true });
        writeFileSync(join(fioriToolsDir, 'migration-logs'), 'not a directory', 'utf-8');

        writeMigrationLog(logEntry, mockLogger as any);

        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to write migration log'));
    });

    test('writeMigrationLog should work with migration failure', () => {
        const logEntry: MigrationLogEntry = {
            timestamp: '2026-10-15T10:30:45.123Z',
            projectPath: '/path/to/failed-project',
            projectName: 'failed-project',
            migrationMessages: [{ type: 'ERROR', description: 'Migration failed' }],
            npmInstall: {
                success: false,
                errors: ['npm ERR! code ERESOLVE', 'npm ERR! ERESOLVE unable to resolve dependency tree'],
                warnings: ['npm WARN deprecated package@1.0.0']
            },
            migrationSuccess: false
        };

        writeMigrationLog(logEntry);

        const logsDir = getMigrationLogsDirectory();
        const files = readdirSync(logsDir);
        expect(files).toHaveLength(1);

        const logFilePath = join(logsDir, files[0]);
        const logContent = JSON.parse(readFileSync(logFilePath, 'utf-8'));
        expect(logContent.migrationSuccess).toBe(false);
        expect(logContent.npmInstall?.success).toBe(false);
        expect(logContent.npmInstall?.errors).toEqual(expect.arrayContaining(['npm ERR! code ERESOLVE']));
    });
});
