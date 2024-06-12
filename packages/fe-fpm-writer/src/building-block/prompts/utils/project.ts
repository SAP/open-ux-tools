/* eslint-disable jsdoc/require-returns */
import { Project, getProject } from '@sap-ux/project-access';
import path, { join } from 'path';
import { type Editor } from 'mem-fs-editor';

// ToDo - I think we do not need ProjectProvider anymore
/**
 *
 */
export class ProjectProvider {
    public appId: string;
    /**
     *
     * @param root
     * @param fs
     */
    constructor(private root: string, private fs?: Editor) {
        this.appId =
            this.root.split(`${path.sep}app${path.sep}`).length > 1
                ? join('app', this.root.split(`${path.sep}app${path.sep}`)[1])
                : '';
    }

    /**
     *
     * @param root
     * @param fs
     */
    static async createProject(root: string, fs?: Editor) {
        return new ProjectProvider(root, fs);
    }

    /**
     * Retrieves the new project structure from @sap-ux/project-access
     * getProject() and converts it to the old structure.
     *
     * @param root - root path of the project
     * @returns - project structure
     */
    async getProject(): Promise<Project> {
        return getProject(this.root.replace(this.appId, ''));
    }
}
