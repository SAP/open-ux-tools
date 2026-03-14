import log from 'sap/base/Log';

const LOG_PREFIX = 'open.ux.preview.client.adp.ovp-bridge';

interface OvpCatalogEntry {
    ServiceUrl: string;
    Description: string;
    TechnicalServiceName: string;
    TechnicalServiceVersion: string;
    MetadataUrl: string;
}

interface OvpMetaModelResponse {
    serviceUrl: string;
    annotationUrls: string[];
}

interface I18nEntry {
    key: string;
    value: string;
    comment?: string;
}

declare global {
    interface Window {
        writeToI18n: (entries: I18nEntry[]) => Promise<void>;
        getNewDataSources: (callback: (dataSources: OvpCatalogEntry[]) => void) => void;
        getMetaModelForNewDataSource: (serviceUrl: string, callback: (metaModel: unknown) => void) => void;
    }
}

function getBaseUrl(): string {
    return document.getElementById('root')?.dataset.openUxPreviewBaseUrl ?? '';
}

/**
 * Registers OVP bridge functions on `window` for the sap.ovp "Add New Card" flow.
 *
 * The sap.ovp library expects three globals:
 * - writeToI18n: persists translatable card texts to i18n properties
 * - getNewDataSources: retrieves available OData services from the ABAP catalog
 * - getMetaModelForNewDataSource: produces an OData metamodel with merged annotations
 */
export function initOvpBridge(): void {
    const baseUrl = getBaseUrl();

    window.writeToI18n = async function (entries: I18nEntry[]): Promise<void> {
        const response = await fetch(`${baseUrl}/editor/i18n`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(entries)
        });
        if (!response.ok) {
            const msg = `writeToI18n failed with status ${response.status}`;
            log.error(msg, LOG_PREFIX);
            throw new Error(msg);
        }
    };

    window.getNewDataSources = function (callback: (dataSources: OvpCatalogEntry[]) => void): void {
        fetch(`${baseUrl}/adp/api/ovp/datasources`)
            .then((response) => response.json())
            .then((data: { dataSources: OvpCatalogEntry[] }) => {
                callback(data.dataSources);
            })
            .catch((error: Error) => {
                log.error(`getNewDataSources failed: ${error.message}`, LOG_PREFIX);
                callback([]);
            });
    };

    window.getMetaModelForNewDataSource = function (
        serviceUrl: string,
        callback: (metaModel: unknown) => void
    ): void {
        const params = new URLSearchParams({ serviceUrl });
        fetch(`${baseUrl}/adp/api/ovp/metamodel?${params.toString()}`)
            .then((response) => response.json())
            .then((data: OvpMetaModelResponse) => {
                sap.ui.require(
                    ['sap/ui/model/odata/v2/ODataModel'],
                    (ODataModel: new (config: object) => { getMetaModel: () => { loaded: () => Promise<void> } }) => {
                        const model = new ODataModel({
                            serviceUrl: data.serviceUrl,
                            annotationURI: data.annotationUrls,
                            json: true,
                            loadAnnotationsJoined: true,
                            skipMetadataAnnotationParsing: false
                        });
                        model
                            .getMetaModel()
                            .loaded()
                            .then(() => {
                                callback(model.getMetaModel());
                            })
                            .catch((error: Error) => {
                                log.error(`MetaModel loading failed: ${error.message}`, LOG_PREFIX);
                                callback(null);
                            });
                    }
                );
            })
            .catch((error: Error) => {
                log.error(`getMetaModelForNewDataSource failed: ${error.message}`, LOG_PREFIX);
                callback(null);
            });
    };

    log.info('OVP bridge functions registered on window', LOG_PREFIX);
}
