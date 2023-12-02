/* eslint-disable jsdoc/require-returns */
import type { Store } from 'mem-fs';
import { getStoreForProject } from './memfs';
import type { Manifest } from '@sap-ux/project-access';
import { join } from 'path';
import type File from 'vinyl';
// import { findFiles } from '@sap-ux/project-access/src/file';
import { type Editor } from 'mem-fs-editor';

/**
 *
 */
class ProjectProvider {
    private store: Store;
    private annotationFiles: string[] = [];
    private metadataFile: string;
    /**
     *
     * @param root
     * @param fs
     */
    constructor(private root: string, private fs?: Editor) {}

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
     *
     *
     */
    getXmlFiles() {
        const manifest = this.getManifestFile();
        const dataSources = manifest['sap.app']?.dataSources;
        const mainService = dataSources?.mainService;
        if (!mainService) {
            throw new Error("Couldn't find the mainService");
        }
        const metadataFileUri = mainService.settings?.localUri ?? '';
        this.metadataFile = this.getFileByName(metadataFileUri).path;
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
}

export default ProjectProvider;
