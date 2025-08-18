import { PageTypeV4 } from '@sap/ux-specification/dist/types/src';
import type { ExportResults } from '@sap/ux-specification/dist/types/src';
import { getTree } from './parser';
import type { PageAnnotations, TreeNode, PropertyPath } from './parser';
import { SapuxFtfsFileIO } from './sapuxFtfsFileIO';
import type { AppData } from './sapuxFtfsFileIO';
import type { ApplicationAccess } from '@sap-ux/project-access';
import { updateProperty } from './json-helper';

export class PageEditorApi {
    private ftfsIO;

    constructor(public appAccess: ApplicationAccess, public pageId?: string) {
        this.ftfsIO = new SapuxFtfsFileIO(appAccess);
    }

    public async getPageTree(annotation?: PageAnnotations): Promise<TreeNode> {
        let tree: TreeNode = {
            children: [],
            path: [],
            properties: [],
            text: ''
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

    public async getApplication(): Promise<AppData> {
        return this.ftfsIO.readApp();
    }

    public async updateApplication(appData: AppData): Promise<void> {
        await this.ftfsIO.writeApp(appData);
    }
}
