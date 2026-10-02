import { ProjectAccess } from './Project.js';
import { join } from 'node:path';
import { getFioriToolsDirectory } from '@sap-ux/store';
import { FileName, FioriToolsSettings } from '@sap-ux/project-access';
import type { ImportProjectInfo, Message, MigrationSettingsFile } from '../types.js';
import { hasDependency, readJSON, findProjectRoot } from './index.js';
import type { MigrationTypes } from './constants.js';

export const readMigrationSettingsFile = async (): Promise<any> => {
    let migrationSettingsFile;
    try {
        migrationSettingsFile = await readJSON(
            join(getFioriToolsDirectory(), FioriToolsSettings.migrationSettingsFile)
        );
    } catch {
        migrationSettingsFile = {};
    }
    return migrationSettingsFile;
};

export const readMigrationSettingsFileIgnoreProjects = async (): Promise<string[]> => {
    const migrationSettingsFile: MigrationSettingsFile = await readMigrationSettingsFile();
    migrationSettingsFile.ignoreProjects = migrationSettingsFile?.ignoreProjects ?? [];
    return migrationSettingsFile?.ignoreProjects;
};

export const checkForMigration = async (
    projectRoot: string,
    type: MigrationTypes,
    libPath?: string
): Promise<boolean> => {
    let migratable;
    let project: { projectInfo: Partial<ImportProjectInfo>; messages: Message[] } = {
        projectInfo: {},
        messages: []
    };

    let packageJson: any;
    let hasUi5Tooling = false;
    try {
        project = await ProjectAccess.getProjectInfo(projectRoot, type, undefined, libPath);
        packageJson = await readJSON(join(projectRoot, FileName.Package));
        hasUi5Tooling = hasDependency(packageJson, '@sap/ux-ui5-tooling') ? true : false;
    } catch {
        // Ignore error and continue below
    }
    // Check if the SAP UX root can be found and if so check if it matches the current root.
    // These checks should ignore Fiori Apps in a CAP Project where Fiori is enabled.
    let sapUXProjectRoot = projectRoot;
    try {
        sapUXProjectRoot = await findProjectRoot(projectRoot, true);
    } catch {
        // In case of error set as project root
        sapUXProjectRoot = projectRoot;
    }

    if (
        project?.projectInfo?.sapux === true ||
        Array.isArray(project.projectInfo.sapux) ||
        project.messages.length > 0 ||
        hasUi5Tooling === true ||
        (await readMigrationSettingsFileIgnoreProjects()).includes(projectRoot) ||
        sapUXProjectRoot !== projectRoot
    ) {
        migratable = false;
    } else {
        migratable = true;
    }
    return migratable;
};
