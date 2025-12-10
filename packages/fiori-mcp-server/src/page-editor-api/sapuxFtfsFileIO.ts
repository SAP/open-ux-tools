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
    PageType,
    ExportParametersV2Type,
    ReadAppResult
} from '@sap/ux-specification/dist/types/src';
import { DirName, SchemaType, PageTypeV4, FileName } from '@sap/ux-specification/dist/types/src';
import { basename, join } from 'node:path';
import type { ApplicationAccess, Manifest } from '@sap-ux/project-access';
import { readFlexChanges } from '@sap-ux/project-access';
import { getFlexChangeLayer, getManifest, getUI5Version } from './project';
import { logger } from '../utils/logger';
import { mergeChanges, writeFlexChanges } from './flex';
import type { ApplicationModel } from '@sap/ux-specification/dist/types/src/parser';

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
        const specification = await this.appAccess.getSpecification<Specification>();
        const apiVersion = specification.getApiVersion();
        const version = typeof apiVersion?.fpmWriter === 'string' ? parseInt(apiVersion.fpmWriter, 10) : 0;
        if (version < 35) {
            // resolved spec is outdated - load latest from global cache
            // ToDo - force from global cache
        }
        return specification;
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
     * @param skipParsing If true, skips parsing the application modeler within the specification.
     * @returns A promise that resolves to an array of File objects
     */
    private async readApp(skipParsing?: boolean): Promise<ReadAppResult> {
        const specification = await this.getSpecification();
        return specification.readApp({
            app: this.appAccess,
            skipParsing
        });
    }

    /**
     * Retrieves virtual files for the project.
     *
     * @param skipParsing If true, skips parsing the application modeler within the specification.
     * @returns A promise that resolves to an array of File objects
     */
    public async getApplicationModel(skipParsing?: boolean): Promise<ApplicationModel | undefined> {
        const app = await this.readApp(skipParsing);
        return app.applicationModel;
    }

    /**
     * Reads the application data.
     *
     * @param files - Optional array of File objects
     * @returns A promise that resolves to an AppData object
     */
    public async readAppData(files?: File[]): Promise<AppData> {
        if (!files) {
            const appData = await this.readApp(true);
            files = appData.files;
        }
        const appJson = files.find((file) => file.dataSourceUri === FileName.App);
        const appConfig = JSON.parse(appJson?.fileContent ?? '{}') as Application;
        const schemaPath = join('.schemas', basename(join(appConfig?.$schema ?? '')));
        const schemaFile = files.find((file) => join(file.dataSourceUri) === schemaPath);
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
            const app = await this.readApp(true);
            const { files } = app;
            const pagePath = join(DirName.Pages, `${pageId}.json`);
            const pageFile = files.find((file) => join(file.dataSourceUri) === pagePath);
            const pageConfig = pageFile?.fileContent ? (JSON.parse(pageFile.fileContent) as PageConfig) : undefined;
            const schemaPath = join('.schemas', basename(join(pageConfig?.$schema ?? '')));
            const schema = files.find((file) => join(file.dataSourceUri) === schemaPath);
            if (pageConfig && schema) {
                const application = await this.readAppData(files);
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
        const specification = await this.getSpecification();
        const schemaType = pageData.pageType === PageTypeV4.ObjectPage ? SchemaType.ObjectPage : SchemaType.ListReport;
        const exportParams = {
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
        const exportConfig = await this.getExportConfigParameters(manifest, exportParams);
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
        const exportParams: ExportParametersV4Type = {
            [SchemaType.Application]: {
                application: config as v4.ApplicationV4,
                manifest,
                jsonSchema: JSON.parse(schema)
            }
        };
        const exportConfig = await this.getExportConfigParameters(manifest, exportParams);
        const result = specification.exportConfig(exportConfig);
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

    /**
     * Builds the export configuration parameters for specification API 'exportConfig' call.
     * Adds 'ui5Version' and 'layer' values to the configuration.
     *
     * @param manifest - The application manifest containing OData service configuration
     * @param params - Partial export parameters to include in the resulting configuration
     * @returns A promise that resolves to the fully composed export configuration object
     */
    private async getExportConfigParameters(
        manifest: Manifest,
        params: Partial<ExportParametersV2Type | ExportParametersV4Type>
    ): Promise<ExportConfigParameters> {
        const odataVersion = manifest['sap.app']?.dataSources?.mainService?.settings?.odataVersion;
        const exportConfig = (odataVersion === '2.0' ? { v2: params } : { v4: params }) as ExportConfigParameters;
        exportConfig.ui5Version = await getUI5Version(this.appAccess);
        exportConfig.layer = await getFlexChangeLayer(this.appAccess.root);
        return exportConfig;
    }
}
