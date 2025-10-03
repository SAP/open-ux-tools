import { PageTypeV4 } from '@sap/ux-specification/dist/types/src';
import type { ExportResults } from '@sap/ux-specification/dist/types/src';
import { getTree } from './parser';
import type { PageAnnotations, TreeNode, PropertyPath } from './parser';
import { SapuxFtfsFileIO } from './sapuxFtfsFileIO';
import type { AppData } from './sapuxFtfsFileIO';
import type { ApplicationAccess } from '@sap-ux/project-access';
import { updateProperty } from './json-helper';

/**
 * Class representing the Page Editor API
 */
export class PageEditorApi {
    private readonly ftfsIO;

    /**
     * Creates an instance of PageEditorApi.
     *
     * @param appAccess - The application access object
     * @param pageId - Optional page identifier
     */
    constructor(
        public appAccess: ApplicationAccess,
        public pageId?: string
    ) {
        this.ftfsIO = new SapuxFtfsFileIO(appAccess);
    }

    /**
     * Retrieves the page tree structure.
     *
     * @param annotation - Optional page annotations
     * @returns Promise resolving to the TreeNode structure
     */
    public async getPageTree(annotation?: PageAnnotations): Promise<TreeNode> {
        let tree: TreeNode = {
            children: [],
            path: [],
            properties: [],
            text: '',
            schema: {}
        };
        if (this.pageId) {
            const pageData = await this.ftfsIO.readPageData(this.pageId);
            if (pageData) {
                tree = getTree(pageData.schema, pageData.config, pageData.pageType as PageTypeV4, annotation);
            }
        } else {
            const pageData = await this.ftfsIO.readApp();
            if (pageData) {
                tree = getTree(pageData.schema, pageData.config, PageTypeV4.ListReport);
            }
        }

        return tree;
    }

    /**
     * Changes a property in the page or application configuration.
     *
     * @param path - The property path to change
     * @param value - The new value for the property
     * @returns Promise resolving to ExportResults or undefined
     */
    public async changeProperty(path: PropertyPath, value: unknown): Promise<ExportResults | undefined> {
        if (this.pageId) {
            const pageData = await this.ftfsIO.readPageData(this.pageId);
            if (pageData) {
                updateProperty(pageData.config, path, value);
                return this.ftfsIO.writePage(pageData);
            }
        } else {
            const appData = await this.ftfsIO.readApp();
            updateProperty(appData.config, path, value);
            return this.ftfsIO.writeApp(appData);
        }
    }

    /**
     * Retrieves the application data.
     *
     * @returns Promise resolving to application data
     */
    public async getApplication(): Promise<AppData> {
        return this.ftfsIO.readApp();
    }

    /**
     * Updates the application data.
     *
     * @param appData - The new application data
     * @returns Promise resolving when the update is complete
     */
    public async updateApplication(appData: AppData): Promise<void> {
        await this.ftfsIO.writeApp(appData);
    }
}
