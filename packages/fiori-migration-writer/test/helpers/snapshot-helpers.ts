/**
 * Snapshot testing helpers
 */
import { join } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';

/**
 * Normalize snapshot content for cross-platform consistency
 */
export function normalizeSnapshot(content: string): string {
    return (
        content
            // Normalize line endings
            .replace(/\r\n/g, '\n')
            // Normalize paths to forward slashes
            .replace(/\\/g, '/')
            // Remove timestamps
            .replace(/"dateTimeStamp":\s*"[^"]+"/g, '"dateTimeStamp": "NORMALIZED"')
            .replace(/"timestamp":\s*\d+/g, '"timestamp": 0')
            // Normalize absolute paths to relative
            .replace(/\/Users\/[^\/]+\/.*?\/packages\//g, 'packages/')
            .replace(/C:\\Users\\[^\\]+\\.*?\\packages\\/g, 'packages/')
    );
}

/**
 * Ensure snapshot directory exists
 */
export function ensureSnapshotDir(snapshotPath: string): void {
    const dir = join(snapshotPath, '..');
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
}

/**
 * Get snapshot path for a test
 */
export function getSnapshotPath(testName: string, fileName: string): string {
    return join(__dirname, '../custom_snapshots', testName, fileName);
}
