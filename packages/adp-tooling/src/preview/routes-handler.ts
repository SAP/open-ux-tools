import * as fs from 'fs';
import * as path from 'path';
import { renderFile } from 'ejs';
import sanitize from 'sanitize-filename';
import type { ToolsLogger } from '@sap-ux/logger';
import type { MiddlewareUtils } from '@ui5/server';
import type { ReaderCollection, Resource } from '@ui5/fs';
import type { NextFunction, Request, Response } from 'express';

import { FolderNames, TemplateFileName, HttpStatusCodes } from '../types';

interface WriteFragmentBody {
    fragmentName: string;
}

interface WriteControllerBody {
    controllerName: string;
    projectId: string;
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
     * Handler for writing a fragment file to the workspace.
     *
     * @param req Request
     * @param res Response
     * @param next Next Function
     */
    public handleWriteFragment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = req.body as WriteFragmentBody;

            const fragmentName = sanitize(data.fragmentName);

            const sourcePath = this.util.getProject().getSourcePath();

            if (!fragmentName) {
                res.status(HttpStatusCodes.BAD_REQUEST).send('Fragment name was not provided!');
                this.logger.debug('Bad request. Fragment name was not provided!');
                return;
            }

            const fullPath = path.join(sourcePath, FolderNames.Changes, FolderNames.Fragments);
            const filePath = path.join(fullPath, `${fragmentName}.fragment.xml`);

            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
            }

            if (fs.existsSync(filePath)) {
                res.status(HttpStatusCodes.CONFLICT).send(`Fragment with name "${fragmentName}" already exists`);
                this.logger.debug(`XML Fragment with name "${fragmentName}" was created`);
                return;
            }

            // Copy the template XML Fragment to the project's workspace
            const fragmentTemplatePath = path.join(__dirname, '../../templates/rta', TemplateFileName.Fragment);
            fs.copyFileSync(fragmentTemplatePath, filePath);

            const message = 'XML Fragment created';
            res.status(HttpStatusCodes.CREATED).send(message);
            this.logger.debug(`XML Fragment with name "${fragmentName}" was created`);
        } catch (e) {
            const sanitizedMsg = sanitize(e.message);
            this.logger.error(sanitizedMsg);
            res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).send(sanitizedMsg);
            next(e);
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

            let controllerExists = false;
            let controllerPath = '';
            let controllerPathFromRoot = '';

            const project = this.util.getProject();
            const sourcePath = project.getSourcePath();
            const rootPath = project.getRootPath();
            const projectName = rootPath.split(/[\\/]/).slice(-1)[0];

            const getPath = (projectPath: string, fileName: string) =>
                path.join(projectPath, FolderNames.Changes, FolderNames.Coding, fileName).replace(/[\\/]/g, path.sep);

            for (const file of codeExtFiles) {
                const fileStr = await file.getString();
                const change = JSON.parse(fileStr) as {
                    selector: {
                        controllerName: string;
                    };
                    content: {
                        codeRef: string;
                    };
                };

                if (change.selector.controllerName === controllerName) {
                    const fileName = change.content.codeRef.replace('coding/', '');
                    controllerPath = getPath(sourcePath, fileName);
                    controllerPathFromRoot = getPath(projectName, fileName);
                    controllerExists = true;
                    break;
                }
            }

            if (controllerExists && !fs.existsSync(controllerPath)) {
                const errorMsg = `Controller extension file was not found at ${controllerPath}`;
                res.status(HttpStatusCodes.NOT_FOUND).send({
                    message: errorMsg
                });
                this.logger.debug(errorMsg);
                return;
            }

            this.sendFilesResponse(res, {
                controllerExists,
                controllerPath,
                controllerPathFromRoot
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

            const fullPath = path.join(sourcePath, FolderNames.Changes, FolderNames.Coding);
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
}
