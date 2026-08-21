import type { Message, MigrationUIProjectInfo } from './types.js';
import { ProjectMigrator } from './ProjectMigrator.js';
import { URI } from 'vscode-uri';
import { i18nText } from './i18n.js';

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
        const migrationResults: MigrationUIProjectInfo[] = [];

        for (const [index, project] of (projects ?? []).entries()) {
            const result = await this.migrateProject(project, index, ui5SnapshotUrl, vscode, internalToggle);
            migrationResults.push(result);
        }

        return migrationResults;
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

        const result = await ProjectMigrator.migrate(
            project.rootPath,
            project.hostname,
            ui5SnapshotUrl,
            project,
            vscode,
            internalToggle
        );

        uxTelemetryPerf.endMark(markName);
        uxTelemetryPerf.measure(markName);

        this.addProjectToWorkspace(project.rootPath, vscode);

        return this.buildMigrationResult(project, result, markName);
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
     * Determine migration status based on result and messages
     *
     * @param result
     * @param result.result
     * @param result.messages
     */
    private determineStatus(result: { result: boolean; messages: Message[] }): 'ERROR' | 'WARNING' | 'SUCCESS' {
        let status: 'ERROR' | 'WARNING' | 'SUCCESS' = result.result === true ? 'SUCCESS' : 'ERROR';

        if (
            result.messages.length &&
            result.messages.every((message) => message.type !== 'ERROR') &&
            result.messages.some((message) => message.type === 'WARNING')
        ) {
            status = 'WARNING';
        } else if (result.messages.length && result.messages.some((message) => message.type === 'ERROR')) {
            status = 'ERROR';
        }

        return status;
    }
}
