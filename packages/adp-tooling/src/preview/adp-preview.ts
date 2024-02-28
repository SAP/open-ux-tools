import express from 'express';
import ZipFile from 'adm-zip';
import type { ReaderCollection } from '@ui5/fs';
import type { MiddlewareUtils } from '@ui5/server';
import type { NextFunction, Request, Response, Router, RequestHandler } from 'express';

import type { ToolsLogger } from '@sap-ux/logger';
import type { UI5FlexLayer } from '@sap-ux/project-access';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import type { MergedAppDescriptor } from '@sap-ux/axios-extension';

import RoutesHandler from './routes-handler';
import type { AdpPreviewConfig, DescriptorVariant } from '../types';

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

    /**
     * @returns merged manifest.
     */
    get descriptor() {
        if (this.mergedDescriptor) {
            return this.mergedDescriptor;
        } else {
            throw new Error('Not initialized');
        }
    }

    /**
     * @returns a list of resources required to the adaptation project as well as the original app.
     */
    get resources() {
        if (this.mergedDescriptor) {
            const resources = {
                [this.mergedDescriptor.name]: this.mergedDescriptor.url
            };
            this.mergedDescriptor.asyncHints.libs.forEach((lib) => {
                if (lib.url?.url) {
                    resources[lib.name] = lib.url.url;
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
        const provider = await createAbapServiceProvider(
            this.config.target,
            { ignoreCertErrors: this.config.ignoreCertErrors },
            true,
            this.logger
        );
        const lrep = provider.getLayeredRepository();

        const zip = new ZipFile();
        const files = await this.project.byGlob('**/*.*');
        for (const file of files) {
            zip.addFile(file.getPath().substring(1), await file.getBuffer());
        }
        const buffer = zip.toBuffer();

        // fetch a merged descriptor from the backend
        await lrep.getCsrfToken();
        this.mergedDescriptor = (await lrep.mergeAppDescriptorVariant(buffer))[descriptorVariant.id];

        return descriptorVariant.layer;
    }

    /**
     * Proxy for the merged application manifest.json and blocking of preload files.
     *
     * @param req incoming request
     * @param res outgoing response object
     * @param next next middleware that is to be called if the request cannot be handled
     */
    async proxy(req: Request, res: Response, next: NextFunction) {
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
     * @param router router that is to be enhanced with the API
     */
    addApis(router: Router): void {
        router.get(ApiRoutes.FRAGMENT, this.routesHandler.handleReadAllFragments as RequestHandler);
        router.post(ApiRoutes.FRAGMENT, express.json(), this.routesHandler.handleWriteFragment as RequestHandler);

        router.get(ApiRoutes.CONTROLLER, this.routesHandler.handleReadAllControllers as RequestHandler);
        router.post(
            ApiRoutes.CONTROLLER,
            express.json(),
            this.routesHandler.handleWriteControllerExt as RequestHandler
        );

        router.get(ApiRoutes.CODE_EXT, this.routesHandler.handleGetControllerExtensionData as RequestHandler);
    }
}
