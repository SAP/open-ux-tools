/* eslint-disable jsdoc/require-returns */
import { getProject } from '@sap-ux/project-access';
import type { Project } from '@sap-ux/project-access';
import path, { join } from 'path';
import { type Editor } from 'mem-fs-editor';

// ToDo - I think we do not need ProjectProvider anymore
/**
 *
 */
// export class ProjectProvider {
//     public appId: string;
//     /**
//      *
//      * @param root
//      * @param fs
//      */
//     constructor(private root: string, private fs?: Editor) {
//         this.appId =
//             this.root.split(`${path.sep}app${path.sep}`).length > 1
//                 ? join('app', this.root.split(`${path.sep}app${path.sep}`)[1])
//                 : '';
//     }

//     /**
//      *
//      * @param root
//      * @param fs
//      */
//     static async createProject(root: string, fs?: Editor) {
//         return new ProjectProvider(root, fs);
//     }

//     /**
//      * Retrieves the new project structure from @sap-ux/project-access
//      * getProject() and converts it to the old structure.
//      *
//      * @returns - project structure
//      */
//     async getProject(): Promise<Project> {
//         return getProject(this.root.replace(this.appId, ''));
//     }
// }

/**
 * Method checks if passed project is CAP project.
 *
 * @param project Project to check
 * @returns true if passed project is CAP project
 */
export function isCapProject(project: Project): boolean {
    return ['CAPJava', 'CAPNodejs'].includes(project.projectType);
}
