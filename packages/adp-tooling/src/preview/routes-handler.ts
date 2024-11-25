import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { renderFile } from 'ejs';
import sanitize from 'sanitize-filename';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';
import type { MiddlewareUtils } from '@ui5/server';
import type { ReaderCollection, Resource } from '@ui5/fs';
import type { NextFunction, Request, Response } from 'express';

import { TemplateFileName, HttpStatusCodes } from '../types';
import { DirName } from '@sap-ux/project-access';
import { ChangeType, type CodeExtChange, type AnnotationFileChange } from '../types';
import { generateChange } from '../writer/editors';
import { ManifestService } from '../base/abap/manifest-service';
import { getAdpConfig, getVariant } from '../base/helper';
import { getAnnotationNamespaces } from '@sap-ux/odata-service-writer';

interface WriteControllerBody {
    controllerName: string;
    projectId: string;
}

interface AnnotationFileDetails {
    fileName: string;
    annotationPath: string;
    annotationPathFromRoot: string;
    annotationExists: boolean;
    isRunningInBAS: boolean;
    annotationFileInUse: boolean;
}
/**
 * @description Handles API Routes
 */
export default class RoutesHandler {
    /**
     * Constructor taking project as input.
     *
     * @param project Reference to the root of the project
     * @param util middleware utilities provided by the UI5 CLI
     * @param logger Logger instance
     */
    constructor(
        private readonly project: ReaderCollection,
        private readonly util: MiddlewareUtils,
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
    private sendFilesResponse(res: Response, data: object | string, contentType: string = 'application/json') {
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
    public handleReadAllFragments = async (_: Request, res: Response, next: NextFunction) => {
        try {
            const files = await this.readAllFilesByGlob('/**/changes/fragments/*.fragment.xml');

            const fileNames = files.map((f) => ({
                fragmentName: f.getName()
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
    public handleReadAllControllers = async (_: Request, res: Response, next: NextFunction) => {
        try {
            const files = await this.readAllFilesByGlob('/**/changes/coding/*.js');

            const fileNames = files.map((f) => ({
                controllerName: f.getName()
            }));

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
    public handleGetControllerExtensionData = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const params = req.params as { controllerName: string };
            const controllerName = sanitize(params.controllerName);
            const codeExtFiles = await this.readAllFilesByGlob('/**/changes/*_codeExt.change');

            let controllerPathFromRoot = '';
            let controllerExists = false;
            let controllerPath = '';
            let changeFilePath = '';

            const project = this.util.getProject();
            const sourcePath = project.getSourcePath();
            const projectName = project.getName();

            const getPath = (projectPath: string, fileName: string, folder: string = DirName.Coding) =>
                path.join(projectPath, DirName.Changes, folder, fileName).split(path.sep).join(path.posix.sep);

            for (const file of codeExtFiles) {
                const fileStr = await file.getString();
                const change = JSON.parse(fileStr) as CodeExtChange;

                if (change.selector.controllerName === controllerName) {
                    const fileName = change.content.codeRef.replace('coding/', '');
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
                isRunningInBAS
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
    public handleWriteControllerExt = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = req.body as WriteControllerBody;

            const controllerExtName = sanitize(data.controllerName);
            const projectId = data.projectId;

            const sourcePath = this.util.getProject().getSourcePath();

            if (!controllerExtName) {
                res.status(HttpStatusCodes.BAD_REQUEST).send('Controller extension name was not provided!');
                this.logger.debug('Bad request. Controller extension name was not provided!');
                return;
            }

            const fullPath = path.join(sourcePath, DirName.Changes, DirName.Coding);
            const filePath = path.join(fullPath, `${controllerExtName}.js`);

            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
            }

            if (fs.existsSync(filePath)) {
                res.status(HttpStatusCodes.CONFLICT).send(
                    `Controller extension with name "${controllerExtName}" already exists`
                );
                this.logger.debug(`Controller extension with name "${controllerExtName}" already exists`);
                return;
            }

            const controllerExtPath = `${projectId}.${controllerExtName}`;

            const controllerTemplateFilePath = path.join(__dirname, '../../templates/rta', TemplateFileName.Controller);

            renderFile(controllerTemplateFilePath, { controllerExtPath }, {}, (err, str) => {
                if (err) {
                    throw new Error('Error rendering template: ' + err.message);
                }

                fs.writeFileSync(filePath, str, { encoding: 'utf8' });
            });

            const message = 'Controller extension created!';
            res.status(HttpStatusCodes.CREATED).send(message);
            this.logger.debug(`Controller extension with name "${controllerExtName}" was created`);
        } catch (e) {
            const sanitizedMsg = sanitize(e.message);
            this.logger.error(sanitizedMsg);
            res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).send(sanitizedMsg);
            next(e);
        }
    };

    public handleCreateAnnoationFile = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { dataSource, serviceUrl } = req.body as { dataSource: string; serviceUrl: string };

            if (!dataSource) {
                res.status(HttpStatusCodes.BAD_REQUEST).send('No datasource found in manifest!');
                this.logger.debug('Bad request. Could not find a datasource in manifest!');
                return;
            }
            const project = this.util.getProject();
            const projectRoot = project.getRootPath();
            const manifestService = await this.getManifestService();
            const metadata = await manifestService.getDataSourceMetadata(dataSource);
            const namespaces = getAnnotationNamespaces({ metadata });
            const fsEditor = await generateChange<ChangeType.ADD_ANNOTATIONS_TO_ODATA>(
                projectRoot,
                ChangeType.ADD_ANNOTATIONS_TO_ODATA,
                {
                    annotation: {
                        dataSource,
                        namespaces,
                        serviceUrl: serviceUrl
                    },
                    variant: getVariant(projectRoot)
                }
            );
            fsEditor.commit((err) => this.logger.error(err));

            const message = 'Annotation file created!';
            res.status(HttpStatusCodes.CREATED).send(message);
        } catch (e) {
            const sanitizedMsg = sanitize(e.message);
            this.logger.error(sanitizedMsg);
            res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).send(sanitizedMsg);
            next(e);
        }
    };

    public handleGetAllAnnotationFilesMappedByDataSource = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const isRunningInBAS = isAppStudio();

            const manifestService = await this.getManifestService();
            const dataSoruces = await manifestService.getManifestDataSources();
            const apiResponse: {
                [dataSourceId: string]: {
                    serviceUrl: string;
                    annotationFiles: AnnotationFileDetails[];
                };
            } = {};
            Object.keys(dataSoruces).forEach((dataSourceId) => {
                if (dataSoruces[dataSourceId].type === 'OData') {
                    apiResponse[dataSourceId] = {
                        annotationFiles: new Array<AnnotationFileDetails>(),
                        serviceUrl: dataSoruces[dataSourceId].uri
                    };
                }
            });
            const project = this.util.getProject();
            const getPath = (projectPath: string, fileName: string, folder: string = DirName.Annotations) =>
                path.join(projectPath, DirName.Changes, folder, fileName).split(path.sep).join(path.posix.sep);

            const annotationChangeFiles = await this.readAllFilesByGlob(
                '/**/changes/**/*_addAnnotationsToOData.change'
            );
            // Iterating the changes file over manifest datasoruce as it is not easy to differntiate the file in workspace and file that is part of base project-
            for (const file of annotationChangeFiles) {
                const fileStr = await file.getString();
                const change = JSON.parse(fileStr) as AnnotationFileChange;
                const dataSourceId = change.content.dataSourceId;
                if (apiResponse[dataSourceId]) {
                    const annotations = manifestService.getAnnotationsForDataSourceId(dataSourceId);
                    // last one in manifest has the highest precidence.
                    const annotationFileInUse = annotations[annotations.length - 1];
                    for (const fileName of change.content.annotations) {
                        const dataSourceInfo = change.content.dataSource[fileName];
                        const fileNameWithExt = dataSourceInfo.uri.split(path.sep).pop();
                        if (dataSourceInfo.type === 'ODataAnnotation' && fileNameWithExt) {
                            const annotationPath = getPath(project.getSourcePath(), fileNameWithExt);
                            const annotationPathFromRoot = getPath(project.getName(), fileNameWithExt);
                            const annotationExists = fs.existsSync(annotationPath);
                            apiResponse[change.content.dataSourceId].annotationFiles.push({
                                fileName: fileNameWithExt,
                                annotationPath: os.platform() === 'win32' ? `/${annotationPath}` : annotationPath,
                                annotationPathFromRoot,
                                annotationExists,
                                isRunningInBAS,
                                annotationFileInUse: annotationFileInUse === fileName ? true : false
                            });
                        }
                    }
                }
            }

            this.sendFilesResponse(res, apiResponse);
        } catch (e) {
            this.handleErrorMessage(res, next, e);
        }
    };

    private async getManifestService(): Promise<ManifestService> {
        const project = this.util.getProject();
        const projectRoot = project.getRootPath();
        const yamlPath = path.join(projectRoot, 'ui5.yaml');
        const variant = getVariant(projectRoot);
        const adpConfig = await getAdpConfig(projectRoot, yamlPath);
        return await ManifestService.initMergedManifest(projectRoot, variant, adpConfig, this.logger);
    }
}
