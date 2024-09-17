import type { Project } from '@sap-ux/project-access';

/**
 * Method checks if passed project is CAP project.
 *
 * @param project Project to check
 * @returns true if passed project is CAP project
 */
export function isCapProject(project: Project): boolean {
    return ['CAPJava', 'CAPNodejs'].includes(project.projectType);
}
