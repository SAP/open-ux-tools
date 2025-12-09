import { PageTypeV4 } from '@sap/ux-specification/dist/types/src';
import type { ExportResults } from '@sap/ux-specification/dist/types/src';
import { getTree, getTree2 } from './parser';
import type { PageAnnotations, TreeNode, PropertyPath } from './parser';
import { SapuxFtfsFileIO } from './sapuxFtfsFileIO';
import type { AppData } from './sapuxFtfsFileIO';
import type { ApplicationAccess } from '@sap-ux/project-access';
import { updateProperty } from './json-helper';
import { ApplicationModel } from '@sap/ux-specification/dist/types/src/parser';

/**
 * Class representing the Page Editor API
 */
export class PageEditorApi {
    private readonly ftfsIO;
    private appModel?: ApplicationModel;

    /**
     * Creates an instance of PageEditorApi.
     *
     * @param appAccess - The application access object
     * @param pageId - Optional page identifier
     */
    constructor(public appAccess: ApplicationAccess, appModel?: ApplicationModel, public pageId?: string) {
        this.ftfsIO = new SapuxFtfsFileIO(appAccess);
        this.appModel = appModel;
    }

    /**
     * Retrieves the page tree structure.
     *
     * @returns Promise resolving to the TreeNode structure
     */
    public async getPageTree(): Promise<TreeNode> {
        let tree: TreeNode = {
            children: [],
            path: [],
            properties: [],
            text: '',
            schema: {}
        };
        if (!this.appModel) {
            this.appModel = await this.ftfsIO.getApplicationModel();
        }
        if (this.appModel) {
            if (this.pageId) {
                const pageModel = this.appModel.pages[this.pageId].model;
                if (pageModel) {
                    tree = getTree2(pageModel);
                }
            } else {
                const appModel = this.appModel.model;
                if (appModel) {
                    // Mark settings as view node to parse it as tree node - in future should be adjusted in specification
                    const appSettings = appModel.root.aggregations.settings as { isViewNode?: boolean };
                    if (appSettings) {
                        appSettings.isViewNode = true;
                    }
                    tree = getTree2(appModel);
                }
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
            const appData = await this.ftfsIO.readAppData();
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
        return this.ftfsIO.readAppData();
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
