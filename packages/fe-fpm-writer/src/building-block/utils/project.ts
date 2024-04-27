/* eslint-disable jsdoc/require-returns */
import { getProject } from '@sap-ux/project-access';
import { type Editor } from 'mem-fs-editor';
import { ProjectTemp, convertProject } from './project-convertor';

/**
 *
 */
class ProjectProvider {
    public appId: string;
    /**
     *
     * @param root
     * @param fs
     */
    constructor(private root: string, private fs?: Editor) {
        this.appId = this.root.split('\\app\\').length > 1 ? `app\\${this.root.split('\\app\\')[1]}` : '';
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
    async getProject(): Promise<ProjectTemp> {
        const project = await getProject(this.root.replace(this.appId, ''));
        return convertProject(project, this.appId);
    }
}

export default ProjectProvider;
