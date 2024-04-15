/* eslint-disable jsdoc/require-returns */
import type { Store } from 'mem-fs';
import { getStoreForProject } from './memfs';
import { getProject, type Manifest } from '@sap-ux/project-access';
import { join } from 'path';
import type File from 'vinyl';
import { type Editor } from 'mem-fs-editor';
import { ProjectTemp, convertProject } from './project-convertor';

/**
 *
 */
class ProjectProvider {
    private store: Store;
    private annotationFiles: string[] = [];
    private metadataFile: string;
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
        const projectProvider = new ProjectProvider(root, fs);
        await projectProvider.createFileSystem();

        return projectProvider;
    }
    private async createFileSystem() {
        this.store = await getStoreForProject(this.root);
    }

    /**
     * Fetches the Service and Annotation Files from `mainService`
     */
    getXmlFiles() {
        const manifest = this.getManifestFile();
        const dataSources = manifest['sap.app']?.dataSources;
        const mainService = dataSources?.mainService;
        if (!mainService) {
            throw new Error("Couldn't find the mainService");
        }
        const metadataFileUri = mainService.settings?.localUri ?? '';
        this.metadataFile = this.getFileByName(join(metadataFileUri)).path;
        mainService.settings?.annotations?.forEach((dataSourceKey) => {
            const uri = dataSources?.[dataSourceKey].settings?.localUri;
            if (uri) {
                const file = this.getFileByName(join(uri));
                this.annotationFiles.push(file.path);
            }
        });
        return [this.metadataFile, ...this.annotationFiles];
    }

    /**
     *
     * @param path
     * @returns {File} the file at `path`
     */
    getFileByPath(path: string): File {
        return this.store.get(path);
    }

    /**
     *
     */
    getManifestFile(): Manifest {
        const manifest = this.getFileByName('manifest.json').contents?.toString();
        if (!manifest) {
            throw new Error('No manifest found');
        }
        return JSON.parse(manifest) as Manifest;
    }
    /**
     *
     * @param pattern
     */
    private getFileByName(pattern: string) {
        let filePath = '';
        this.store.each((file) => {
            if (file.path.includes(pattern)) {
                filePath = file.path;
            }
        });
        return this.store.get(filePath);
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
