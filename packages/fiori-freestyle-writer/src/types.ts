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
         * Enables NPM workspaces for the root CAP project module when the application is generated with a `capService`.
         * If set to `true`, NPM workspaces will be enabled for the root module. For details, refer to the `applyCAPUpdates` function at
         * {@link ../../cap-config-writer/src/cap-writer/updates.ts}.
         *
         * Examples:
         * - With NPM Workspaces** (and `cds-plugin-ui5` enabled):
         *   `"watch-typescript": "cds watch --open com.test.typescript/index.html?sap-ui-xx-viewCache=false"`
         *
         * - Without NPM Workspaces**:
         *   `"watch-javascript": "cds watch --open javascript/webapp/index.html?sap-ui-xx-viewCache=false"`
         */
        enableNPMWorkspaces?: boolean;
    };
}

// We need this for the service version
export { OdataVersion } from '@sap-ux/odata-service-writer';
