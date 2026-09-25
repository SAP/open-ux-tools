import { findProjectRoot, getProjectType, fileExists } from '../utils/index.js';
import { MigrationError } from '../utils/common.js';
import { i18nText } from '../i18n.js';

/**
 * Validates that the project is suitable for migration.
 * Checks if project is within a CAP project structure and rejects if so.
 *
 * @param projectRoot - Root directory of the project to validate
 * @throws {MigrationError} If project is a Fiori app within a CAP project
 */
export async function validateProjectForMigration(projectRoot: string): Promise<void> {
    // Quick existence check to avoid hanging on non-existent paths
    if (!(await fileExists(projectRoot))) {
        // Path doesn't exist - skip validation (will fail later with appropriate error)
        return;
    }

    // Check if the SAP UX root can be found and if so check if it matches the current root.
    // These checks should ignore Fiori Apps in a CAP Project where Fiori is enabled.
    let sapUXProjectRoot = projectRoot;

    try {
        sapUXProjectRoot = await findProjectRoot(projectRoot, true);
    } catch {
        // In case of error, use project root as-is
        sapUXProjectRoot = projectRoot;
    }

    // If project root differs and parent is a CAP project, reject migration
    // Modern @sap-ux/project-access returns 'CAPJava' | 'CAPNodejs' for CAP projects
    const projectType = await getProjectType(sapUXProjectRoot);
    const isCapProject = projectType === 'CAPJava' || projectType === 'CAPNodejs';

    if (sapUXProjectRoot !== projectRoot && isCapProject) {
        throw new MigrationError(new Error(i18nText('ERROR_NOT_SUITABLE_FOR_MIGRATION')), undefined, true);
    }
}
