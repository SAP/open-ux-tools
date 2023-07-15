import type { ToolsLogger } from '@sap-ux/logger';
import { ZipFile } from 'yazl';
import type { AdaptationProjectConfig } from '../types';
import { createBuffer, createProvider } from './service';
import type { NextFunction, Request, Response } from 'express';
import type { MergedAppDescriptor } from '@sap-ux/axios-extension';
import type { DescriptorVariant } from '../types';
import type { Resource } from '@ui5/fs';

/**
 * Instance of an adaptation project handling requests and data transformation.
 */
export class AdpPreview {
    /**
     * Merged descriptor variant with reference app manifest
     */
    private mergedDescriptor: MergedAppDescriptor;

    /**
     * @returns Merged manifest.
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
        if (this.descriptor) {
            const resources = {
                [this.descriptor.name]: this.descriptor.url,
                [this.descriptor.manifest['sap.app'].id]: this.descriptor.url
            };
            this.descriptor.asyncHints.libs.forEach((lib) => {
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
     * @param logger logger instance
     */
    constructor(private readonly config: AdaptationProjectConfig, private readonly logger: ToolsLogger) {}

    /**
     * Fetch all required configurations from the backend and initialize all configurations.
     *
     * @param descriptorVariant descriptor variant from the project
     * @param files all relevant project files (e.g. webapp content)
     */
    async init(descriptorVariant: DescriptorVariant, files: Resource[]) {
        const provider = await createProvider(this.config, this.logger);
        const lrep = provider.getLayeredRepository();

        const zip = new ZipFile();
        for (const file of files) {
            zip.addBuffer(await file.getBuffer(), file.getPath().substring(1));
        }
        const buffer = await createBuffer(zip);

        // validate namespace & layer combination and fetch csrf token
        await lrep.isExistingVariant(descriptorVariant.namespace, descriptorVariant.layer);
        this.mergedDescriptor = (await lrep.mergeAppDescriptorVariant(buffer))[descriptorVariant.id];
    }

    /**
     * Proxy for the merged application manifest.json and blocking of preload files.
     *
     * @param req incoming request
     * @param res outgoing response object
     * @param next next middleware that is to be called if the request cannot be handled
     */
    async proxy(req: Request, res: Response, next: NextFunction) {
        if (req.path.endsWith('/manifest.json')) {
            res.status(200);
            res.send(JSON.stringify(this.descriptor.manifest, undefined, 2));
        } else if (req.path.endsWith('/Component-preload.js')) {
            res.status(404);
        } else {
            next();
        }
    }
}
