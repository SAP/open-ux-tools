import type { ToolsLogger } from '@sap-ux/logger';
import { ZipFile } from 'yazl';
import type { AdaptationProjectConfig } from '../types';
import { createBuffer, createProvider } from './service';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

interface PreviewData {
    id: string;
    name: string;
    url: string;
    manifest: any;
}

/**
 *
 */
export class AdaptationProject {
    private previewData: PreviewData;

    /**
     * @returns Merged manifest.
     */
    get manifest() {
        if (this.previewData) {
            return this.previewData.manifest;
        } else {
            throw new Error('Not initialized');
        }
    }

    /**
     * @returns a list of resources required to the adaptation project as well as the original app.
     */
    get resources() {
        if (this.previewData) {
            return {
                [this.previewData.name]: this.previewData.url,
                [this.previewData.id]: this.previewData.url
            };
        } else {
            throw new Error('Not initialized');
        }
    }

    /**
     * @returns the required routing.
     */
    get proxy(): RequestHandler {
        if (this.proxyFn) {
            return this.proxyFn;
        } else {
            throw new Error('Not initialized');
        }
    }
    private proxyFn: RequestHandler;

    /**
     *
     * @param config
     * @param logger
     */
    constructor(private readonly config: AdaptationProjectConfig, private readonly logger: ToolsLogger) {}

    /**
     *
     * @param appDescriptor
     */
    async init(appDescriptor: any) {
        const provider = await createProvider(this.config, this.logger);
        const lrep = provider.getLayeredRepository();
        // quick & dirty to get xsrf token
        await lrep.isExistingVariant(appDescriptor);

        const zip = new ZipFile();
        zip.addBuffer(Buffer.from(JSON.stringify(appDescriptor)), 'manifest.appdescr_variant');
        const buffer = await createBuffer(zip);

        this.previewData = ((await lrep.mergeAppDescriptorVariant(buffer)) as any)[appDescriptor.id] as PreviewData;
        this.previewData.id = appDescriptor.id;
        await this.initProxy(provider.defaults!.baseURL!);
    }

    /**
     * Initialize the proxy handler.
     *
     * @param host target (backend) host.
     */
    async initProxy(host: string) {
        const proxy = createProxyMiddleware({
            target: host,
            secure: this.config.strictSsl === true
        });
        this.proxyFn = (req: Request, res: Response, next: NextFunction) => {
            if (req.path.startsWith(this.previewData.url)) {
                if (req.path.endsWith('/manifest.json')) {
                    res.status(200);
                    res.send(JSON.stringify(this.manifest, undefined, 2));
                } else {
                    proxy(req, res, next);
                }
            } else {
                next();
            }
        };
    }
}
