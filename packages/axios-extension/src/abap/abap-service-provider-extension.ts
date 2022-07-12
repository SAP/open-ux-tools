import type { ODataVersion } from '../base/odata-service';
import type { AtoSettings } from './adt';
import type { AdtSchemaStore } from './adt/adt-schema-store';
import type { CatalogService } from './catalog';
import type { AdtCollection } from './types';
import type { Ui5AbapRepositoryService } from './ui5-abap-repository-service';

export interface AbapServiceProviderExtension {
    s4Cloud: boolean | undefined;
    user(): Promise<string>;
    catalog(oDataVersion: ODataVersion): CatalogService;
    ui5AbapRepository(): Ui5AbapRepositoryService;
    getSchemaStore(): AdtSchemaStore;
    getAtoInfo(schema?: AdtCollection): Promise<AtoSettings>;
    getTransportRequests(packageName: string, appName: string, schema?: AdtCollection): Promise<string[]>;
}
