import type { ToolsLogger } from '@sap-ux/logger';
import { ZipFile } from 'yazl';
import type { AdpPreviewConfig, DescriptorVariant } from '../types';
import { createBuffer, createProvider } from './service';
import type { NextFunction, Request, Response } from 'express';
import type { MergedAppDescriptor } from '@sap-ux/axios-extension';
import type { Resource } from '@ui5/fs';
import type { UI5FlexLayer } from '@sap-ux/project-access';

/**
 * Instance of an adaptation project handling requests and data transformation.
 */
export class AdpPreview {
    /**
     * Merged descriptor variant with reference app manifest
     */
    private mergedDescriptor: MergedAppDescriptor;

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
                [this.mergedDescriptor.name]: this.mergedDescriptor.url,
                [this.mergedDescriptor.manifest['sap.app'].id]: this.mergedDescriptor.url
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
     * @param logger logger instance
     */
    constructor(private readonly config: AdpPreviewConfig, private readonly logger: ToolsLogger) {}

    /**
     * Fetch all required configurations from the backend and initialize all configurations.
     *
     * @param descriptorVariant descriptor variant from the project
     * @param files all relevant project files (e.g. webapp content)
     * @returns the UI5 flex layer for which editing is enabled
     */
    async init(descriptorVariant: DescriptorVariant, files: Resource[]): Promise<UI5FlexLayer> {
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

        return descriptorVariant.layer;
    }

    /**
     * Proxy for the merged application manifest.json and blocking of preload files.
     *
     * @param req incoming request
     * @param res outgoing response object
     * @param next next middleware that is to be called if the request cannot be handled
     */
    proxy(req: Request, res: Response, next: NextFunction) {
        if (req.path.endsWith('manifest.json')) {
            res.status(200);
            res.send(JSON.stringify(this.descriptor.manifest, undefined, 2));
        } else if (req.path.endsWith('Component-preload.js')) {
            res.status(404).send();
        } else {
            next();
        }
    }
}
