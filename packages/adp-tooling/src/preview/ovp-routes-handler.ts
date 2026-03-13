import type { ToolsLogger } from '@sap-ux/logger';
import type { NextFunction, Request, Response } from 'express';
import type { AbapServiceProvider, ODataServiceV2Info } from '@sap-ux/axios-extension';
import { ODataVersion } from '@sap-ux/axios-extension';

import { HttpStatusCodes } from '../types';

interface GetMetaModelRequestBody {
    dataSource: {
        ID: string;
        Title: string;
    };
}

/**
 * Converts an absolute URL to a relative path.
 * Annotation URIs from the catalog service are absolute (e.g. https://host/sap/opu/...).
 * The client needs relative paths so requests go through the backend proxy.
 *
 * @param uri Absolute or relative URI
 * @returns Relative path
 */
function toRelativePath(uri: string): string {
    try {
        return new URL(uri).pathname;
    } catch {
        return uri;
    }
}

/**
 * Server-side handler for OVP bridge function API routes.
 * Provides data source catalog and service metadata endpoints
 * consumed by the client-side OVP bridge functions.
 */
export default class OvpRoutesHandler {
    /**
     * Creates an instance of OvpRoutesHandler.
     *
     * @param provider AbapServiceProvider instance for backend communication
     * @param logger Logger instance
     */
    constructor(
        private readonly provider: AbapServiceProvider,
        private readonly logger: ToolsLogger
    ) {}

    /**
     * Handler for fetching available OData V2 services from the catalog.
     *
     * @param _req Request
     * @param res Response
     * @param next Next function
     */
    public handleGetDataSources = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const catalogService = this.provider.catalog(ODataVersion.v2);
            const response = await catalogService.get<ODataServiceV2Info[]>('/ServiceCollection', {
                params: { $format: 'json' }
            });
            const services = response.odata();
            res.status(HttpStatusCodes.OK).json({ results: services });
            this.logger.debug(`OVP: Fetched ${services.length} data sources from catalog`);
        } catch (e) {
            this.logger.error(`OVP: Failed to fetch data sources: ${(e as Error).message}`);
            res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
                message: `Failed to fetch data sources: ${(e as Error).message}`
            });
            next(e);
        }
    };

    /**
     * Handler for fetching service info and annotation URLs for a selected data source.
     * Returns the service URL and annotation details so the client can create
     * a real UI5 ODataModel with annotations merged for full metamodel support.
     *
     * @param req Request containing dataSource in body
     * @param res Response
     * @param next Next function
     */
    public handleGetMetaModel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { dataSource } = req.body as GetMetaModelRequestBody;
            this.logger.debug(`OVP: getMetaModel called for service ${dataSource?.Title ?? 'unknown'}`);
            if (!dataSource?.Title) {
                res.status(HttpStatusCodes.BAD_REQUEST).json({ message: 'dataSource with Title is required' });
                return;
            }

            const catalogService = this.provider.catalog(ODataVersion.v2);
            const filterOptions = dataSource.ID ? { id: dataSource.ID } : { title: dataSource.Title };
            const annotations = await catalogService.getAnnotations(filterOptions);

            if (annotations.length === 0) {
                res.status(HttpStatusCodes.OK).json(null);
                this.logger.debug(`OVP: No annotations found for service ${dataSource.Title}`);
                return;
            }

            const serviceUrl = `/sap/opu/odata/sap/${dataSource.Title}/`;
            res.status(HttpStatusCodes.OK).json({
                serviceUrl,
                annotations: annotations.map((a) => ({
                    TechnicalName: a.TechnicalName,
                    Uri: toRelativePath(a.Uri)
                })),
                modelInformation: {
                    serviceURI: `/sap/opu/odata/sap/${dataSource.Title}`,
                    serviceAnnotation: annotations[0].TechnicalName,
                    serviceAnnotationURI: toRelativePath(annotations[0].Uri)
                }
            });
            this.logger.debug(
                `OVP: Fetched service info for ${dataSource.Title} with ${annotations.length} annotations`
            );
        } catch (e) {
            this.logger.error(`OVP: Failed to fetch metamodel: ${(e as Error).message}`);
            res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
                message: `Failed to fetch metamodel: ${(e as Error).message}`
            });
            next(e);
        }
    };
}
