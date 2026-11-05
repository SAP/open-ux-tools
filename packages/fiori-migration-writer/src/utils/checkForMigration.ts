import { ProjectAccess } from './Project.js';
import { join } from 'node:path';
import { getFioriToolsDirectory } from '@sap-ux/store';
import { FileName, FioriToolsSettings } from '@sap-ux/project-access';
import type { MemFsEditor } from 'mem-fs-editor';
import { createMemFsEditor } from './fs-adapter.js';
import type { ImportProjectInfo, Message, MigrationSettingsFile } from '../types.js';
import { hasDependency, readJSON, findProjectRoot } from './index.js';
import type { MigrationTypes } from './constants.js';

export const readMigrationSettingsFile = async (fsEditor?: MemFsEditor): Promise<any> => {
    const fs = fsEditor ?? createMemFsEditor();
    let migrationSettingsFile;
    try {
        migrationSettingsFile = await readJSON(
            fs,
            join(getFioriToolsDirectory(), FioriToolsSettings.migrationSettingsFile)
        );
    } catch (error: unknown) {
        migrationSettingsFile = {};
    }
    return migrationSettingsFile;
};

export const readMigrationSettingsFileIgnoreProjects = async (fsEditor?: MemFsEditor): Promise<string[]> => {
    const migrationSettingsFile: MigrationSettingsFile = await readMigrationSettingsFile(fsEditor);
    migrationSettingsFile.ignoreProjects = migrationSettingsFile?.ignoreProjects ?? [];
    return migrationSettingsFile?.ignoreProjects;
};

export const checkForMigration = async (
    projectRoot: string,
    type: MigrationTypes,
    libPath?: string,
    fsEditor?: MemFsEditor
): Promise<boolean> => {
    const fs = fsEditor ?? createMemFsEditor();
    let project: { projectInfo: Partial<ImportProjectInfo>; messages: Message[] } = {
        projectInfo: {},
        messages: []
    };

    let packageJson: any;
    let hasUi5Tooling = false;
    try {
        project = await ProjectAccess.getProjectInfo(projectRoot, type, undefined, libPath, fs);
        packageJson = await readJSON(fs, join(projectRoot, FileName.Package));
        hasUi5Tooling =
            hasDependency(packageJson, '@sap-ux/ui5-tooling') || hasDependency(packageJson, '@sap/ux-ui5-tooling');
    } catch (error: unknown) {
        // Ignore error and continue below
    }
    // Check if the SAP UX root can be found and if so check if it matches the current root.
    // These checks should ignore Fiori Apps in a CAP Project where Fiori is enabled.
    let sapUXProjectRoot = projectRoot;
    try {
        sapUXProjectRoot = await findProjectRoot(projectRoot, true);
    } catch (error: unknown) {
        // In case of error set as project root
        sapUXProjectRoot = projectRoot;
    }

    const migratable = !(
        project?.projectInfo?.sapux === true ||
        Array.isArray(project.projectInfo.sapux) ||
        project.messages.length > 0 ||
        hasUi5Tooling === true ||
        (await readMigrationSettingsFileIgnoreProjects(fs)).includes(projectRoot) ||
        sapUXProjectRoot !== projectRoot
    );
    return migratable;
};
