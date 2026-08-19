import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { renderFile } from 'ejs';

import sanitize from 'sanitize-filename';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';
// eslint-disable-next-line sonarjs/no-implicit-dependencies
import type { MiddlewareUtils } from '@ui5/server';
// eslint-disable-next-line sonarjs/no-implicit-dependencies
import type { ReaderCollection, Resource } from '@ui5/fs';
import type { NextFunction, Request, Response } from 'express';

import { TemplateFileName, HttpStatusCodes } from '../types.js';
import { DirName } from '@sap-ux/project-access';
import type { DataSources, CodeExtChange } from '../types.js';
import { ManifestService } from '../base/abap/manifest-service.js';
import { getVariant, isTypescriptSupported } from '../base/helper.js';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { getTemplatePath } from '../templates.js';

interface WriteControllerBody {
    controllerName: string;
    projectId: string;
}

interface AnnotationFileDetails {
    fileName?: string;
    annotationPath?: string;
    annotationPathFromRoot?: string;
    annotationExistsInWS: boolean;
}

interface AnnotationDataSourceMap {
    [key: string]: {
        serviceUrl: string;
        annotationDetails: AnnotationFileDetails;
        metadataReadErrorMsg: string | undefined;
    };
}
export interface AnnotationDataSourceResponse {
    isRunningInBAS: boolean;
    annotationDataSourceMap: AnnotationDataSourceMap;
}

type ControllerInfo = { controllerName: string };

interface ControllerExtensionLookup {
    baseControllerExists: boolean;
    baseControllerPath: string;
    baseControllerPathFromRoot: string;
    instanceControllerExists: boolean;
    instanceControllerPath: string;
    instanceControllerPathFromRoot: string;
    missingChangeFilePaths: string[];
    isTsSupported: boolean;
}

/**
 * @description Handles API Routes
 */
export default class RoutesHandler {
    /**
     * Whether this is running in build path mode (CF ADP using build output).
     */
    private readonly isBuildPathMode: boolean;

    private readonly isWin32 = os.platform() === 'win32';

    /**
     * Constructor taking project as input.
     *
     * @param project Reference to the root of the project
     * @param util middleware utilities provided by the UI5 CLI
     * @param provider AbapServiceProvider instance
     * @param logger Logger instance
     */
    constructor(
        private readonly project: ReaderCollection,
        private readonly util: MiddlewareUtils,
        private readonly provider: AbapServiceProvider,
        private readonly logger: ToolsLogger
    ) {
        this.isBuildPathMode = !provider || typeof provider.getLayeredRepository !== 'function';
    }

    /**
     * Reads files from workspace by given search pattern.
     *
     * @param pattern Search pattern
     * @returns Array of files
     */
    private async readAllFilesByGlob(pattern: string): Promise<Resource[]> {
        return this.project.byGlob(pattern);
    }

    /**
     * Sends response with data to the client.
     *
     * @param res Response
     * @param data Data that is sent to the client
     * @param contentType Content type, defaults to json
     */
    private sendFilesResponse(res: Response, data: object | string, contentType: string = 'application/json'): void {
        res.status(HttpStatusCodes.OK).contentType(contentType).send(data);
    }

    /**
     * Sanitizes and handles error messages.
     *
     * @param res Response
     * @param next Next function
     * @param e Error
     * @param e.message Error message
     */
    private handleErrorMessage(res: Response, next: NextFunction, e: { message: string }): void {
        const sanitizedMsg = sanitize(e.message);
        this.logger.error(sanitizedMsg);
        res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).send({ message: sanitizedMsg });
        next(e);
    }

    /**
     * Handler for reading all fragment files from the workspace.
     *
     * @param _ Request
     * @param res Response
     * @param next Next Function
     */
    public handleReadAllFragments = async (_: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const files = await this.readAllFilesByGlob('/**/changes/fragments/*.fragment.xml');

            const fileNames = files.map((file) => ({
                fragmentName: file.getName()
            }));

            this.sendFilesResponse(res, {
                fragments: fileNames,
                message: `${fileNames.length} fragments found in the project workspace.`
            });
            this.logger.debug(`Read fragments ${JSON.stringify(fileNames)}`);
        } catch (e) {
            this.handleErrorMessage(res, next, e);
        }
    };

    /**
     * Handler for reading all controller extension files from the workspace.
     *
     * @param _ Request
     * @param res Response
     * @param next Next Function
     */
    public handleReadAllControllers = async (_: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const files = await this.readAllFilesByGlob('/**/changes/coding/*.{js,ts}');

            const fileNames = files.map((file) => {
                const fullName = file.getName();
                const name = fullName.replace(/\.(js|ts)$/, '');
                return { controllerName: name } satisfies ControllerInfo;
            });

            this.sendFilesResponse(res, {
                controllers: fileNames,
                message: `${fileNames.length} controllers found in the project workspace.`
            });
            this.logger.debug(`Read controllers ${JSON.stringify(fileNames)}`);
        } catch (e) {
            this.handleErrorMessage(res, next, e);
        }
    };

    /**
     * Handler for retrieving existing controller extension data from the workspace.
     *
     * @param req Request
     * @param res Response
     * @param next Next Function
     */
    public handleGetControllerExtensionData = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const query = req.query as { name: string; viewId?: string };
            const controllerName = query.name;
            const viewId = query.viewId;
            const codeExtFiles = await this.readAllFilesByGlob('/**/changes/*_codeExt.change');

            const lookup = await this.resolveControllerExtensions(codeExtFiles, controllerName, viewId);
            const {
                baseControllerExists,
                baseControllerPath,
                baseControllerPathFromRoot,
                instanceControllerExists,
                instanceControllerPath,
                instanceControllerPathFromRoot,
                missingChangeFilePaths,
                isTsSupported
            } = lookup;

            if (!baseControllerExists && !instanceControllerExists && missingChangeFilePaths.length > 0) {
                const errorMsg = `Please delete the change file(s) at "${missingChangeFilePaths.join('", "')}" and retry creating the controller extension.`;
                this.logger.debug(errorMsg);
                res.status(HttpStatusCodes.NOT_FOUND).send({ message: errorMsg });
                return;
            }

            const isRunningInBAS = isAppStudio();

            this.sendFilesResponse(res, {
                baseControllerExists,
                baseControllerPath: this.toResponsePath(baseControllerPath),
                baseControllerPathFromRoot,
                instanceControllerExists,
                instanceControllerPath: this.toResponsePath(instanceControllerPath),
                instanceControllerPathFromRoot,
                isRunningInBAS,
                isTsSupported
            });
            this.logger.debug(
                `Controller '${controllerName}' existence — base: ${baseControllerExists}, instance (viewId '${
                    viewId ?? ''
                }'): ${instanceControllerExists}`
            );
        } catch (e) {
            this.handleErrorMessage(res, next, e);
        }
    };

    /**
     * Resolves base and instance-specific controller extensions from the workspace's codeExt change files.
     *
     * @param codeExtFiles codeExt change files read from the workspace
     * @param controllerName Controller name to match against each change's selector
     * @param viewId Optional view ID used to detect an instance-specific extension for the current view
     * @returns Existence flags and paths for base/instance controllers, plus any stale change reference
     */
    private async resolveControllerExtensions(
        codeExtFiles: Resource[],
        controllerName: string,
        viewId: string | undefined
    ): Promise<ControllerExtensionLookup> {
        const project = this.util.getProject();
        const sourcePath = project.getSourcePath();
        const projectName = project.getName();
        const isTsSupported = isTypescriptSupported(project.getRootPath());

        const getPath = (projectPath: string, fileName: string, folder: string = DirName.Coding) =>
            path.join(projectPath, DirName.Changes, folder, fileName).split(path.sep).join(path.posix.sep);

        const lookup: ControllerExtensionLookup = {
            baseControllerExists: false,
            baseControllerPath: '',
            baseControllerPathFromRoot: '',
            instanceControllerExists: false,
            instanceControllerPath: '',
            instanceControllerPathFromRoot: '',
            missingChangeFilePaths: [],
            isTsSupported
        };

        for (const file of codeExtFiles) {
            const change = JSON.parse(await file.getString()) as CodeExtChange;

            const changeViewId = change.content.viewId;
            const isBase = !changeViewId;
            const isInstanceForView = !!viewId && changeViewId === viewId;

            if (change.selector.controllerName !== controllerName || (!isBase && !isInstanceForView)) {
                continue;
            }

            const baseFileName = change.content.codeRef.replace('coding/', '');
            const fileName = isTsSupported ? baseFileName.replace('.js', '.ts') : baseFileName;
            const controllerPath = getPath(sourcePath, fileName);
            const controllerPathFromRoot = getPath(projectName, fileName);
            const changeFilePath = getPath(projectName, file.getName(), '');

            if (!fs.existsSync(controllerPath)) {
                lookup.missingChangeFilePaths.push(changeFilePath);
                this.logger.debug(
                    `Change file at "${changeFilePath}" references a missing controller at "${controllerPath}".`
                );
                continue;
            }

            if (isBase) {
                lookup.baseControllerExists = true;
                lookup.baseControllerPath = controllerPath;
                lookup.baseControllerPathFromRoot = controllerPathFromRoot;
            } else {
                lookup.instanceControllerExists = true;
                lookup.instanceControllerPath = controllerPath;
                lookup.instanceControllerPathFromRoot = controllerPathFromRoot;
            }
        }

        // A stale change file (missing controller on disk) is only fatal when no valid controller
        // was found at all. If a valid base or instance controller exists alongside the stale entry,
        // the 200 response reflects what is actually present and the debug log above provides
        // server-side visibility of the dangling change file.
        return lookup;
    }

    /**
     * Handler for writing a controller extension file to the workspace.
     *
     * @param req Request
     * @param res Response
     * @param next Next Function
     */
    public handleWriteControllerExt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const data = req.body as WriteControllerBody;

            const name = sanitize(data.controllerName);

            const sourcePath = this.util.getProject().getSourcePath();
            const rootPath = this.util.getProject().getRootPath();

            if (!name) {
                res.status(HttpStatusCodes.BAD_REQUEST).send('Controller extension name was not provided!');
                this.logger.debug('Bad request. Controller extension name was not provided!');
                return;
            }

            const isTsSupported = isTypescriptSupported(rootPath);

            const fullPath = path.join(sourcePath, DirName.Changes, DirName.Coding);
            const filePath = path.join(fullPath, `${name}.${isTsSupported ? 'ts' : 'js'}`);

            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
            }

            if (fs.existsSync(filePath)) {
                res.status(HttpStatusCodes.CONFLICT).send(`Controller extension with name "${name}" already exists`);
                this.logger.debug(`Controller extension with name "${name}" already exists`);
                return;
            }

            await generateControllerFile(rootPath, filePath, name);

            const message = 'Controller extension created!';
            res.status(HttpStatusCodes.CREATED).send(message);
            this.logger.debug(`Controller extension with name "${name}" was created`);
        } catch (e) {
            const sanitizedMsg = sanitize(e.message);
            this.logger.error(sanitizedMsg);
            res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).send(sanitizedMsg);
            next(e);
        }
    };

    /**
     * Handler for mapping annotation files with datasoruce.
     *
     * @param _req Request
     * @param res Response
     * @param next Next Function
     */
    public handleGetAllAnnotationFilesMappedByDataSource = async (
        _req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const isRunningInBAS = isAppStudio();

            if (this.isBuildPathMode) {
                // In build path mode (CF ADP), skip ManifestService as it requires ABAP backend
                const apiResponse: AnnotationDataSourceResponse = {
                    isRunningInBAS,
                    annotationDataSourceMap: {}
                };
                this.sendFilesResponse(res, apiResponse);
                return;
            }

            const manifestService = await this.getManifestService();
            const dataSources = manifestService.getManifestDataSources();
            const apiResponse: AnnotationDataSourceResponse = {
                isRunningInBAS,
                annotationDataSourceMap: {}
            };

            for (const dataSourceId in dataSources) {
                if (dataSources[dataSourceId].type === 'OData') {
                    const metadataReadErrorMsg = await this.getMetaDataReadErrorMsg(manifestService, dataSourceId);
                    apiResponse.annotationDataSourceMap[dataSourceId] = {
                        annotationDetails: {
                            annotationExistsInWS: false
                        },
                        serviceUrl: dataSources[dataSourceId].uri,
                        metadataReadErrorMsg
                    };
                }
                this.fillAnnotationDataSourceMap(dataSources, dataSourceId, apiResponse.annotationDataSourceMap);
            }
            this.sendFilesResponse(res, apiResponse);
        } catch (e) {
            this.handleErrorMessage(res, next, e);
        }
    };

    /**
     *
     * @param manifestService
     * @param dataSrouceID
     * @returns error message with reason
     */
    private async getMetaDataReadErrorMsg(
        manifestService: ManifestService,
        dataSrouceID: string
    ): Promise<string | undefined> {
        let errorMessage;
        try {
            await manifestService.getDataSourceMetadata(dataSrouceID);
        } catch (error) {
            errorMessage = `Metadata: ${error.message as string}`;
        }
        return errorMessage;
    }

    /**
     * Add local annotation details to api response.
     *
     * @param dataSources DataSources
     * @param dataSourceId string
     * @param apiResponse AnnotationDataSourceMap
     */
    private fillAnnotationDataSourceMap(
        dataSources: DataSources,
        dataSourceId: string,
        apiResponse: AnnotationDataSourceMap
    ): void {
        const project = this.util.getProject();
        const getPath = (projectPath: string, relativePath: string): string =>
            path.join(projectPath, relativePath).split(path.sep).join(path.posix.sep);
        const annotations = [...(dataSources[dataSourceId].settings?.annotations ?? [])].reverse();
        for (const annotation of annotations) {
            const annotationSetting = dataSources[annotation];
            if (annotationSetting.type === 'ODataAnnotation') {
                const ui5NamespaceUri = `ui5://${project.getNamespace()}`;
                if (annotationSetting.uri.startsWith(ui5NamespaceUri)) {
                    const localAnnotationUri = annotationSetting.uri.replace(ui5NamespaceUri, '');
                    const annotationPath = getPath(project.getSourcePath(), localAnnotationUri);
                    const annotationPathFromRoot = getPath(project.getName(), localAnnotationUri);
                    const annotationExists = fs.existsSync(annotationPath);
                    apiResponse[dataSourceId].annotationDetails = {
                        fileName: path.parse(localAnnotationUri).base,
                        annotationPath: this.toResponsePath(annotationPath),
                        annotationPathFromRoot,
                        annotationExistsInWS: annotationExists
                    };
                }
                if (apiResponse[dataSourceId].annotationDetails.annotationExistsInWS) {
                    break;
                }
            }
        }
    }

    /**
     * Returns manifest service.
     *
     * @returns Promise<ManifestService>
     */
    private async getManifestService(): Promise<ManifestService> {
        const project = this.util.getProject();
        const basePath = project.getRootPath();
        const variant = await getVariant(basePath);

        return await ManifestService.initMergedManifest(this.provider, basePath, variant, this.logger);
    }

    private toResponsePath(p: string): string {
        return p && this.isWin32 ? `/${p}` : p;
    }
}

/**
 * Generates a controller file for the Adaptation Project based on the project's TypeScript support.
 *
 * This function creates a controller file in the specified `filePath` by rendering a template.
 * It determines whether to use a TypeScript or JavaScript template based on the TypeScript support of the project.
 *
 * @param {string} rootPath - The root directory of the project.
 * @param {string} filePath - The destination path where the generated controller file should be saved.
 * @param {string} name - The name of the controller extension (used in TypeScript templates).
 * @throws {Error} Throws an error if rendering the template fails.
 */
async function generateControllerFile(rootPath: string, filePath: string, name: string): Promise<void> {
    const id = (await getVariant(rootPath))?.id;
    const isTsSupported = isTypescriptSupported(rootPath);
    const tmplFileName = isTsSupported ? TemplateFileName.TSController : TemplateFileName.Controller;
    const tmplPath = getTemplatePath(`rta/${tmplFileName}`);
    const extensionPath = `${id}.${name}`;

    const templateData = isTsSupported ? { name, ns: id } : { extensionPath };

    renderFile(tmplPath, templateData, {}, (err, str) => {
        if (err) {
            throw new Error(`Error rendering ${isTsSupported ? 'TypeScript' : 'JavaScript'} template: ${err.message}`);
        }

        fs.writeFileSync(filePath, str, { encoding: 'utf8' });
    });
}
