import { Ui5App } from '@sap/ux-ui5-application-template';
import { OdataService } from '@sap/ux-odata-service-template';

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
    mainObject: Entity;
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