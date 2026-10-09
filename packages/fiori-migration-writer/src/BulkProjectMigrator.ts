import type { Message, MigrationUIProjectInfo } from './types.js';
import { ProjectMigrator } from './ProjectMigrator.js';
import { URI } from 'vscode-uri';
import { i18nText } from './i18n.js';
import { createMemFsEditor } from './utils/fs-adapter.js';

// Telemetry stub - @sap-ux/telemetry is an optional dependency for performance measurement
// This provides a no-op implementation for open-source usage
const uxTelemetryPerf = {
    startMark: (name: string) => name,
    endMark: (_name: string) => {},
    measure: (_name: string) => {},
    getMeasurementDuration: (_name: string) => 0
};

export class BulkProjectMigrator {
    /**
     * Migrate projects
     *
     * @param projects
     * @param ui5SnapshotUrl
     * @param vscode
     * @param internalToggle
     */
    public async migrate(
        projects: MigrationUIProjectInfo[],
        ui5SnapshotUrl: string,
        vscode?: any,
        internalToggle: boolean = false
    ): Promise<MigrationUIProjectInfo[]> {
        // Migrate projects sequentially to avoid mem-fs adapter races
        // The shared module-global mem-fs adapter is enabled/disabled per migration
        const results: MigrationUIProjectInfo[] = [];
        for (const [index, project] of (projects ?? []).entries()) {
            results.push(await this.migrateProject(project, index, ui5SnapshotUrl, vscode, internalToggle));
        }
        return results;
    }

    /**
     * Migrate a single project
     *
     * @param project
     * @param index
     * @param ui5SnapshotUrl
     * @param vscode
     * @param internalToggle
     */
    private async migrateProject(
        project: MigrationUIProjectInfo,
        index: number,
        ui5SnapshotUrl: string,
        vscode: any,
        internalToggle: boolean
    ): Promise<MigrationUIProjectInfo> {
        const markName = uxTelemetryPerf.startMark('project' + index);

        // Create editor here and pass explicitly so ownsEditor is false inside ProjectMigrator.migrate
        // This prevents double-commit (migrate() won't auto-commit when editor is passed)
        const editor = createMemFsEditor();
        const { fs, result, messages } = await ProjectMigrator.migrate(
            project.rootPath,
            project.hostname,
            ui5SnapshotUrl,
            project,
            vscode,
            internalToggle,
            editor
        );

        // Commit changes to disk for this project
        if (result) {
            try {
                await new Promise<void>((resolve, reject) => {
                    fs.commit((err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            } catch (error) {
                // Handle both callback errors and synchronous throws from fs.commit
                throw new Error(
                    `Failed to commit migration changes: ${error instanceof Error ? error.message : String(error)}`
                );
            }
        }

        uxTelemetryPerf.endMark(markName);
        uxTelemetryPerf.measure(markName);

        this.addProjectToWorkspace(project.rootPath, vscode);

        return this.buildMigrationResult(project, { result, messages }, markName);
    }

    /**
     * Add project folder to VS Code workspace if not already present
     *
     * @param rootPath
     * @param vscode
     */
    private addProjectToWorkspace(rootPath: string, vscode: any): void {
        if (!vscode?.workspace?.workspaceFile) {
            return;
        }

        const uri = URI.file(rootPath);
        if (!vscode.workspace.getWorkspaceFolder(uri)) {
            const folderCount = vscode.workspace.workspaceFolders?.length ?? 0;
            vscode.workspace.updateWorkspaceFolders(folderCount, null, { uri });
        }
    }

    /**
     * Build migration result with status and messages
     *
     * @param project
     * @param result
     * @param result.result
     * @param result.messages
     * @param markName
     */
    private buildMigrationResult(
        project: MigrationUIProjectInfo,
        result: { result: boolean; messages: Message[] },
        markName: string
    ): MigrationUIProjectInfo {
        const messages: Message[] = [...result.messages];
        const migrationResult: MigrationUIProjectInfo = {
            ...project,
            migrationTime: uxTelemetryPerf.getMeasurementDuration(markName),
            status: this.determineStatus(result),
            messages
        };

        if (result.result === true) {
            messages.unshift({
                type: 'SUCCESS',
                description: i18nText('SUCCESSFULLY_MIGRATED_MSG')
            });
        }

        return migrationResult;
    }

    /**
     * Determine migration status based on result and messages.
     *
     * Note: A successful migration (result.result === true) may still return 'ERROR' status
     * if the messages array contains ERROR-severity entries for non-fatal issues that were
     * logged during migration but didn't prevent file generation. Callers should check both
     * the result.result field (did migration complete?) and status (were there issues?).
     *
     * @param result - Migration result object
     * @param result.result - Whether migration completed successfully
     * @param result.messages - Array of messages generated during migration
     * @returns 'ERROR' if result is false OR messages contain errors,
     *          'WARNING' if result is true and messages contain warnings but no errors,
     *          'SUCCESS' if result is true and no errors or warnings
     */
    private determineStatus(result: { result: boolean; messages: Message[] }): 'ERROR' | 'WARNING' | 'SUCCESS' {
        // If migration result is false, it's definitely an error
        if (result.result === false) {
            return 'ERROR';
        }

        // Migration succeeded (result.result === true), now check message severity
        if (result.messages.some((message) => message.type === 'ERROR')) {
            // Has ERROR messages even though migration succeeded - likely non-fatal errors
            return 'ERROR';
        } else if (result.messages.some((message) => message.type === 'WARNING')) {
            // Has warnings but no errors
            return 'WARNING';
        }

        // No errors or warnings
        return 'SUCCESS';
    }
}
