import { Ui5App } from '@sap-ux/ui5-application-writer';
import { OdataService } from '@sap-ux/odata-service-writer';

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

export interface FreestyleApp<T> extends Ui5App {
    template: Template<T>;
    service?: OdataService;
}

// We need this for the service version
export { OdataVersion } from '@sap-ux/odata-service-writer';
