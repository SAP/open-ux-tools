import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { renderFile } from 'ejs';
import sanitize from 'sanitize-filename';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';
import type { MiddlewareUtils } from '@ui5/server';
import type { ReaderCollection, Resource } from '@ui5/fs';
import type { NextFunction, Request, Response } from 'express';

import { TemplateFileName, HttpStatusCodes } from '../types';
import { DirName } from '@sap-ux/project-access';
import { type CodeExtChange } from '../types';
import { ManifestService } from '../base/abap/manifest-service';
import type { DataSources } from '../base/abap/manifest-service';
import { getVariant, isTypescriptSupported } from '../base/helper';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

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

/**
 * @description Handles API Routes
 */
export default class RoutesHandler {
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
    ) {}

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
            const query = req.query as { name: string };
            const controllerName = query.name;
            const codeExtFiles = await this.readAllFilesByGlob('/**/changes/*_codeExt.change');

            let controllerPathFromRoot = '';
            let controllerExists = false;
            let controllerPath = '';
            let changeFilePath = '';

            const project = this.util.getProject();
            const sourcePath = project.getSourcePath();
            const rootPath = this.util.getProject().getRootPath();
            const projectName = project.getName();

            const isTsSupported = isTypescriptSupported(rootPath);

            const getPath = (projectPath: string, fileName: string, folder: string = DirName.Coding) =>
                path.join(projectPath, DirName.Changes, folder, fileName).split(path.sep).join(path.posix.sep);

            for (const file of codeExtFiles) {
                const fileStr = await file.getString();
                const change = JSON.parse(fileStr) as CodeExtChange;

                if (change.selector.controllerName === controllerName) {
                    const baseFileName = change.content.codeRef.replace('coding/', '');
                    const fileName = isTsSupported ? baseFileName.replace('.js', '.ts') : baseFileName;
                    controllerPath = getPath(sourcePath, fileName);
                    controllerPathFromRoot = getPath(projectName, fileName);
                    changeFilePath = getPath(projectName, file.getName(), '');
                    controllerExists = true;
                    break;
                }
            }

            if (controllerExists && !fs.existsSync(controllerPath)) {
                const errorMsg = `Please delete the change file at "${changeFilePath}" and retry creating the controller extension.`;
                this.logger.debug(errorMsg);
                res.status(HttpStatusCodes.NOT_FOUND).send({ message: errorMsg });
                return;
            }

            const isRunningInBAS = isAppStudio();

            this.sendFilesResponse(res, {
                controllerExists,
                controllerPath: os.platform() === 'win32' ? `/${controllerPath}` : controllerPath,
                controllerPathFromRoot,
                isRunningInBAS,
                isTsSupported
            });
            this.logger.debug(
                controllerExists
                    ? `Controller exists at '${controllerPath}'`
                    : `Controller with controllerName '${controllerName}' does not exist`
            );
        } catch (e) {
            this.handleErrorMessage(res, next, e);
        }
    };

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
                        annotationPath: os.platform() === 'win32' ? `/${annotationPath}` : annotationPath,
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
    const tmplPath = path.join(__dirname, '../../templates/rta', tmplFileName);
    const extensionPath = `${id}.${name}`;

    const templateData = isTsSupported ? { name, ns: id } : { extensionPath };

    renderFile(tmplPath, templateData, {}, (err, str) => {
        if (err) {
            throw new Error(`Error rendering ${isTsSupported ? 'TypeScript' : 'JavaScript'} template: ${err.message}`);
        }

        fs.writeFileSync(filePath, str, { encoding: 'utf8' });
    });
}
