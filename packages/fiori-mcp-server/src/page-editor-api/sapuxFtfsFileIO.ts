import type {
    v4,
    ExportParametersV4Type,
    ExportConfigParameters,
    ExportResults,
    PageConfig,
    File,
    GenerateCustomExtensionParams,
    Specification,
    Application,
    PageType
} from '@sap/ux-specification/dist/types/src';
import { DirName, SchemaType, PageTypeV4, FileName } from '@sap/ux-specification/dist/types/src';
import { basename, join } from 'node:path';
import type { ApplicationAccess, Manifest } from '@sap-ux/project-access';
import { readFlexChanges } from '@sap-ux/project-access';
import { getManifest, getUI5Version, readAnnotationFiles } from './project';
import { logger } from '../utils/logger';
import { mergeChanges, writeFlexChanges } from './flex';

export interface PageData {
    pageId: string;
    config: PageConfig;
    pageType: PageType;
    schema: string;
    entitySet?: string;
    entityType?: string;
    contextPath?: string;
    page: v4.Page;
}

export interface AppData {
    config: Application;
    schema: string;
}

/**
 * Class for handling file I/O operations for page editor.
 * Mainly it uses specification to import(manifest->config/schema) or export(config->manifest).
 */
export class SapuxFtfsFileIO {
    private readonly appAccess: ApplicationAccess;

    /**
     * Creates an instance of SapuxFtfsFileIO.
     *
     * @param appAccess - The application access object
     */
    constructor(appAccess: ApplicationAccess) {
        this.appAccess = appAccess;
    }

    /**
     * Retrieves the Specification object.
     *
     * @returns A promise that resolves to a Specification object
     */
    private async getSpecification(): Promise<Specification> {
        return this.appAccess.getSpecification();
    }

    /**
     * Extracts the application ID from the manifest.
     *
     * @param manifest - The Manifest object
     * @returns The application ID as a string
     */
    private getAppId(manifest: Manifest): string {
        return manifest['sap.app']?.id ?? '';
    }

    /**
     * Retrieves virtual files for the project.
     *
     * @returns A promise that resolves to an array of File objects
     */
    private async getVirtualFiles(): Promise<File[]> {
        const manifest = await getManifest(this.appAccess);
        if (!manifest) {
            return [];
        }
        const specification = await this.getSpecification();
        const annotationData = await readAnnotationFiles(this.appAccess);
        const changeFiles = await readFlexChanges(this.appAccess.app.changes);
        // Import project using specification API
        return specification.importProject({
            manifest: manifest,
            annotations: annotationData,
            flex: Object.values(changeFiles)
        });
    }

    /**
     * Reads the application data.
     *
     * @param files - Optional array of File objects
     * @returns A promise that resolves to an AppData object
     */
    public async readApp(files?: File[]): Promise<AppData> {
        files ??= await this.getVirtualFiles();
        const appJson = files.find((file) => file.dataSourceUri === FileName.App);
        const appConfig = JSON.parse(appJson?.fileContent ?? '{}') as Application;
        const schemaPath = join('.schemas', basename(join(appConfig?.$schema ?? '')));
        const schemaFile = files.find((file) => join(file.dataSourceUri) === schemaPath);
        if (schemaFile) {
            const schema = JSON.parse(schemaFile.fileContent);
            if (schema.properties?.settings) {
                schema.properties.settings.isViewNode = true;
            }
            schemaFile.fileContent = JSON.stringify(schema);
        }
        return {
            config: appConfig,
            schema: schemaFile?.fileContent ?? '{}'
        };
    }

    /**
     * Get page data object using Project Provider.
     *
     * @param pageId - page id.
     * @returns Promise to page data.
     */
    public async readPageData(pageId: string): Promise<PageData | undefined> {
        try {
            const files = await this.getVirtualFiles();
            const pagePath = join(DirName.Pages, `${pageId}.json`);
            const pageFile = files.find((file) => join(file.dataSourceUri) === pagePath);
            const pageConfig = pageFile?.fileContent ? (JSON.parse(pageFile.fileContent) as PageConfig) : undefined;
            const schemaPath = join('.schemas', basename(join(pageConfig?.$schema ?? '')));
            const schema = files.find((file) => join(file.dataSourceUri) === schemaPath);
            if (pageConfig && schema) {
                const application = await this.readApp(files);
                const page = application.config.pages?.[pageId];
                if (page) {
                    const pageType = page.pageType;
                    return {
                        pageId,
                        pageType: pageType ?? PageTypeV4.ListReport,
                        config: pageConfig,
                        page: page as v4.Page,
                        schema: schema.fileContent,
                        entitySet: page.entitySet,
                        entityType:
                            'entityType' in page && typeof page.entityType === 'string' ? page.entityType : undefined,
                        contextPath: page.contextPath
                    };
                }
            }
        } catch (error) {
            logger.error(String(error));
        }
        return undefined;
    }

    /**
     * Update content of the passed page.
     *
     * @param pageData Page data.
     * @returns Result of export operation.
     */
    public async writePage(pageData: PageData): Promise<ExportResults | undefined> {
        const manifest = await getManifest(this.appAccess);
        if (!manifest) {
            return;
        }
        const odataVersion = manifest['sap.app']?.dataSources?.mainService?.settings?.odataVersion;
        const specification = await this.getSpecification();
        const schemaType = pageData.pageType === PageTypeV4.ObjectPage ? SchemaType.ObjectPage : SchemaType.ListReport;
        const params = {
            [schemaType]: {
                appId: this.getAppId(manifest),
                jsonSchema: JSON.parse(pageData.schema),
                manifest,
                page: {
                    ...pageData.page,
                    name: pageData.pageId,
                    config: pageData.config
                } as v4.PageV4
            }
        };
        const exportConfig = (odataVersion === '2.0' ? { v2: params } : { v4: params }) as ExportConfigParameters;
        const result = specification.exportConfig(exportConfig);
        if (result.manifestChangeIndicator === 'Updated') {
            await this.appAccess.updateManifestJSON(result.manifest);
        }
        // Update flex changes
        const changesPath = this.appAccess.app.changes;
        const oldChangeFiles = await readFlexChanges(this.appAccess.app.changes);
        const mergedChangeFiles = mergeChanges(changesPath, oldChangeFiles, result.flexChanges);
        const fsEditor = await writeFlexChanges(changesPath, mergedChangeFiles);
        await fsEditor.commit(() => {
            //empty callback, do nothing.
        });
        result.flexChanges = Object.keys(fsEditor.dump());
        return result;
    }

    /**
     * Writes the application data.
     *
     * @param appData - The AppData object to write
     * @returns A promise that resolves to ExportResults or undefined
     */
    public async writeApp(appData: AppData): Promise<ExportResults | undefined> {
        const { config, schema } = appData;
        const manifest = await getManifest(this.appAccess);
        if (!manifest) {
            return;
        }
        const specification = await this.getSpecification();
        const params: ExportParametersV4Type = {
            [SchemaType.Application]: {
                application: config as v4.ApplicationV4,
                manifest,
                jsonSchema: JSON.parse(schema)
            }
        };

        const result = specification.exportConfig({
            v4: params
        });
        await this.appAccess.updateManifestJSON(result.manifest);
        return result;
    }

    /**
     * Writes FPM (Flexible Programming Model) data.
     *
     * @param params - The GenerateCustomExtensionParams object
     * @returns A promise that resolves to an array of strings
     */
    public async writeFPM(params: GenerateCustomExtensionParams): Promise<string[]> {
        if (params.data) {
            params.data.minUI5Version = await getUI5Version(this.appAccess);
        }
        const specification = await this.getSpecification();
        const fsEditor = await specification.generateCustomExtension(params);
        await fsEditor?.commit(() => {
            //empty callback, do nothing.
        });
        return fsEditor ? Object.keys(fsEditor.dump()) : [];
    }
}
