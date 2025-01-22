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
         * Enables NPM workspaces for the application. 
         * This is applicable when the service is of type `capService`. For more details, refer to the 
         * `applyCAPUpdates` function at {@link ../../cap-config-writer/src/cap-writer/updates.ts}.
         * When set to true and the CDS UI5 plugin is enabled, the application will be served using the `appId`.
         */
        enableNPMWorkspaces?: boolean;
    };
}

// We need this for the service version
export { OdataVersion } from '@sap-ux/odata-service-writer';
