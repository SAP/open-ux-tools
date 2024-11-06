import ZipFile from 'adm-zip';
import type { ReaderCollection } from '@ui5/fs';
import type { MiddlewareUtils } from '@ui5/server';
import type { NextFunction, Request, Response, Router, RequestHandler } from 'express';

import type { Logger, ToolsLogger } from '@sap-ux/logger';
import type { UI5FlexLayer } from '@sap-ux/project-access';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import type { LayeredRepositoryService, MergedAppDescriptor } from '@sap-ux/axios-extension';

import RoutesHandler from './routes-handler';
import type { AdpPreviewConfig, CommonChangeProperties, DescriptorVariant, OperationType } from '../types';
import type { Editor } from 'mem-fs-editor';
import { addXmlFragment, isAddXMLChange, moduleNameContentMap, tryFixChange } from './change-handler';

export const enum ApiRoutes {
    FRAGMENT = '/adp/api/fragment',
    CONTROLLER = '/adp/api/controller',
    CODE_EXT = '/adp/api/code_ext/:controllerName'
}

/**
 * Instance of an adaptation project handling requests and data transformation.
 */
export class AdpPreview {
    /**
     * Merged descriptor variant with reference app manifest
     */
    private mergedDescriptor: MergedAppDescriptor;
    /**
     * Routes handler class to handle API requests
     */
    private routesHandler: RoutesHandler;

    private lrep: LayeredRepositoryService | undefined;
    private descriptorVariantId: string | undefined;

    /**
     * @returns merged manifest.
     */
    get descriptor(): MergedAppDescriptor {
        if (this.mergedDescriptor) {
            return this.mergedDescriptor;
        } else {
            throw new Error('Not initialized');
        }
    }

    /**
     * @returns a list of resources required to the adaptation project as well as the original app.
     */
    get resources(): {
        [name: string]: string;
    } {
        if (this.mergedDescriptor) {
            const resources = {
                [this.mergedDescriptor.name]: this.mergedDescriptor.url
            };
            this.mergedDescriptor.asyncHints.libs?.forEach((lib) => {
                if (lib.url?.url) {
                    resources[lib.name] = lib.url.url;
                }
            });
            this.mergedDescriptor.asyncHints.components?.forEach((comp) => {
                if (comp.url?.url) {
                    resources[comp.name] = comp.url.url;
                }
            });
            return resources;
        } else {
            throw new Error('Not initialized');
        }
    }

    /**
     * Constructor taking the config and a logger as input.
     *
     * @param config adp config
     * @param project reference to the root of the project
     * @param util middleware utilities provided by the UI5 CLI
     * @param logger logger instance
     */
    constructor(
        private readonly config: AdpPreviewConfig,
        private readonly project: ReaderCollection,
        private readonly util: MiddlewareUtils,
        private readonly logger: ToolsLogger
    ) {
        this.routesHandler = new RoutesHandler(project, util, logger);
    }

    /**
     * Fetch all required configurations from the backend and initialize all configurations.
     *
     * @param descriptorVariant descriptor variant from the project
     * @returns the UI5 flex layer for which editing is enabled
     */
    async init(descriptorVariant: DescriptorVariant): Promise<UI5FlexLayer> {
        this.descriptorVariantId = descriptorVariant.id;
        const provider = await createAbapServiceProvider(
            this.config.target,
            { ignoreCertErrors: this.config.ignoreCertErrors },
            true,
            this.logger
        );
        this.lrep = provider.getLayeredRepository();
        // fetch a merged descriptor from the backend
        await this.lrep.getCsrfToken();

        await this.sync();
        return descriptorVariant.layer;
    }

    /**
     * Synchronize local changes with the backend.
     *
     */
    async sync(): Promise<void> {
        if (!this.lrep || !this.descriptorVariantId) {
            throw new Error('Not initialized');
        }
        const zip = new ZipFile();
        const files = await this.project.byGlob('**/*.*');
        for (const file of files) {
            zip.addFile(file.getPath().substring(1), await file.getBuffer());
        }
        const buffer = zip.toBuffer();

        this.mergedDescriptor = (await this.lrep.mergeAppDescriptorVariant(buffer, '//'))[this.descriptorVariantId];
    }

    /**
     * Proxy for the merged application manifest.json and blocking of preload files.
     *
     * @param req incoming request
     * @param res outgoing response object
     * @param next next middleware that is to be called if the request cannot be handled
     */
    async proxy(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (req.path === '/manifest.json') {
            res.status(200);
            res.send(JSON.stringify(this.descriptor.manifest, undefined, 2));
        } else if (req.path === '/Component-preload.js') {
            res.status(404).send();
        } else {
            // check if the requested file exists in the file system (replace .js with .* for typescript)
            const files = await this.project.byGlob(req.path.replace('.js', '.*'));
            if (files.length === 1) {
                // redirect to the exposed path so that other middlewares can handle it
                res.redirect(302, req.path);
            } else {
                next();
            }
        }
    }

    /**
     * Add additional APIs to the router that are required for adaptation projects only.
     *
     * This method sets up various GET and POST routes for handling fragments, controllers,
     * and code extensions. For POST routes to work correctly, ensure that the router is
     * using the **express.json()** middleware. This middleware is responsible for parsing
     * incoming requests with JSON payloads and is based on body-parser.
     *
     * Usage:
     * ```ts
     * import express from "express";
     *
     * const app = express();
     * const router = express.Router();
     *
     * // Ensure express.json() middleware is applied to the router or app
     * router.use(express.json());
     *
     * const adp = new AdpPreview();
     * adp.addApis(router);
     *
     * app.use('/', router);
     * ```
     *
     * @param {Router} router - The router that is to be enhanced with the API.
     * @returns {void} A promise that resolves when the APIs have been added.
     */
    addApis(router: Router): void {
        router.get(ApiRoutes.FRAGMENT, this.routesHandler.handleReadAllFragments as RequestHandler);

        router.get(ApiRoutes.CONTROLLER, this.routesHandler.handleReadAllControllers as RequestHandler);
        router.post(ApiRoutes.CONTROLLER, this.routesHandler.handleWriteControllerExt as RequestHandler);

        router.get(ApiRoutes.CODE_EXT, this.routesHandler.handleGetControllerExtensionData as RequestHandler);
    }

    /**
     * Handles different types of change requests to project files.
     *
     * @param {string} type - The type of change request.
     * @param {CommonChangeProperties} change - An object containing properties common to all change types.
     * @param {Editor} fs - An instance of an editor interface for file system operations.
     * @param {Logger} logger - An instance of a logging interface for message logging.
     * @returns {Promise<void>} A promise that resolves when the change request has been processed.
     */
    async onChangeRequest(
        type: OperationType,
        change: CommonChangeProperties,
        fs: Editor,
        logger: Logger
    ): Promise<void> {
        switch (type) {
            case 'read':
                if (moduleNameContentMap[change.changeType] && !change.moduleName) {
                    tryFixChange(change, logger);
                }
                break;
            case 'write':
                if (isAddXMLChange(change)) {
                    addXmlFragment(this.util.getProject().getSourcePath(), change, fs, logger);
                }
                break;
            default:
                // no need to handle delete changes
                break;
        }
    }
}
