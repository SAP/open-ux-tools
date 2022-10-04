import type { ODataVersion } from '../base/odata-service';
import type { AtoSettings } from './adt-catalog';
import type { CatalogService } from './catalog';
import type { Ui5AbapRepositoryService } from './ui5-abap-repository-service';

export interface AbapServiceProviderExtension {
    s4Cloud: boolean | undefined;
    user(): Promise<string>;
    catalog(oDataVersion: ODataVersion): CatalogService;
    ui5AbapRepository(): Ui5AbapRepositoryService;
    getAtoInfo(): Promise<AtoSettings>;
    getTransportRequests(packageName: string, appName: string): Promise<string[]>;
    createTransportRequest(description: string): Promise<string>;
}
