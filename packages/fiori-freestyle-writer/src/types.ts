import type { Ui5App, App, AppOptions } from '@sap-ux/ui5-application-writer';
import type { OdataService } from '@sap-ux/odata-service-writer';
import type { CapServiceCdsInfo } from '@sap-ux/cap-config-writer';

export enum TemplateType {
    Basic = 'basic',
    Worklist = 'worklist',
    ListDetail = 'listdetail'
}

interface Entity {
    name: string;
    key: string;
    idProperty: string;
    numberProperty?: string;
    unitOfMeasureProperty?: string;
}

export interface BasicAppSettings {
    viewName?: string;
}
export interface WorklistSettings {
    entity: Entity;
}

export interface ListDetailSettings {
    entity: Entity;
    lineItem: Entity;
}

export interface Template<T = {}> {
    type: TemplateType;
    settings: T;
}
export interface FioriApp extends App {
    flpAppId?: string;
}
export interface FreestyleApp<T> extends Ui5App {
    template: Template<T>;
    service?: OdataService & {
        capService?: CapServiceCdsInfo;
    };
    app: FioriApp;
    appOptions?: Partial<AppOptions> & {
        enableNPMWorkspaces?: boolean;
    };
}

// We need this for the service version
export { OdataVersion } from '@sap-ux/odata-service-writer';
