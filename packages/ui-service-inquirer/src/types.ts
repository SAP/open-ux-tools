import type { ServiceProvider, UiServiceGenerator } from '@sap-ux/axios-extension';
import type { BackendSystem } from '@sap-ux/store';
import type { Destination } from '@sap-ux/btp-utils';
import type { promptNames, SystemSelectionAnswerType } from '@sap-ux/odata-service-inquirer';
import type { AbapDeployConfigAnswersInternal } from '@sap-ux/abap-deploy-config-inquirer';
import type { YUIQuestion } from '@sap-ux/inquirer-common';
import type { Question } from 'inquirer';

export interface UiServiceAnswers extends AbapDeployConfigAnswersInternal {
    [promptNames.systemSelection]?: SystemSelectionAnswerType;
    businessObjectInterface?: string;
    cdsView?: string;
    objectType?: ObjectType;
    serviceName?: string;
    launchAppGen?: boolean;
}

export interface ServiceConfig {
    content: string;
    serviceName: string;
}

export type SystemSelectionQuestion = Question<UiServiceAnswers>;
export type ServiceConfigQuestion = YUIQuestion<UiServiceAnswers>;

export interface SystemSelectionAnswers {
    /**
     * The connected system will allow downstream consumers to access the connected system without creating new connections.
     *
     */
    connectedSystem?: {
        /**
         * Convienence property to pass the connected system
         */
        serviceProvider: ServiceProvider;

        /**
         * The persistable backend system representation of the connected service provider
         * `newOrUpdated` is set to true if the system was newly created or updated during the connection validation process and should be considered for storage.
         */
        backendSystem?: BackendSystem & { newOrUpdated?: boolean };

        /**
         * The destination information for the connected system
         */
        destination?: Destination;
    };
    objectGenerator?: UiServiceGenerator;
}

export enum ObjectType {
    BUSINESS_OBJECT = 'BusinessObject',
    CDS_VIEW = 'CDSView'
}
