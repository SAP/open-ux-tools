import type { ToolsLogger } from '@sap-ux/logger';
import { ZipFile } from 'yazl';
import type { AdaptationProjectConfig } from '../types';
import { createBuffer, createProvider } from './service';
import type { NextFunction, Request, Response } from 'express';
import { MergedAppDescriptor } from '@sap-ux/axios-extension';
import { DescriptorVariant } from './types';
import { Resource } from '@ui5/fs';

/**
 *
 */
export class AdaptationProject {
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
            this.descriptor.asyncHints.libs.forEach(lib => {
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
     *
     * @param config
     * @param logger
     */
    constructor(private readonly config: AdaptationProjectConfig, private readonly logger: ToolsLogger) {}

    /**
     *
     * @param descriptorVariant
     */
    async init(descriptorVariant: DescriptorVariant, files: Resource[]) {
        const provider = await createProvider(this.config, this.logger);
        const lrep = provider.getLayeredRepository();
        // the result does not matter, we just need an XSRF token
        await lrep.isExistingVariant(descriptorVariant.namespace);

        const zip = new ZipFile();
        for (const file of files) {
            zip.addBuffer(await file.getBuffer(), file.getPath().substring(1));
        }
        const buffer = await createBuffer(zip);

        this.mergedDescriptor = (await lrep.mergeAppDescriptorVariant(buffer))[descriptorVariant.id];
    }

    /**
     * Initialize the proxy handler.
     *
     * @param host target (backend) host.
     */
    async proxy(req: Request, res: Response, next: NextFunction) {
        if (req.path.endsWith('/manifest.json')) {
            res.status(200);
            res.send(JSON.stringify(this.descriptor.manifest, undefined, 2));
        } else {
            next();
        }
    }
}
