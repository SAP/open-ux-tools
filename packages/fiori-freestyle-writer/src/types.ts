import type { Ui5App, App, AppOptions } from '@sap-ux/ui5-application-writer';
import type { OdataService } from '@sap-ux/odata-service-writer';
import type { CapServiceCdsInfo } from '@sap-ux/cap-config-writer';

export const TemplateType = {
    Basic: 'basic',
    Worklist: 'worklist',
    ListDetail: 'listdetail'
} as const;

export type TemplateType = (typeof TemplateType)[keyof typeof TemplateType];

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
        /**
         * If the application is being generated with a `capService` into an exising root Cap project module and this is set to true,
         * npm workspaces will be enabled for the root module. For more information see 
         * `applyCAPUpdates` function at {@link ../../cap-config-writer/src/cap-writer/updates.ts}.
         */
        enableNPMWorkspaces?: boolean;
    };
}

// We need this for the service version
export { OdataVersion } from '@sap-ux/odata-service-writer';
