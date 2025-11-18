import { ApplicationAccess } from '@sap-ux/project-access';
import { FioriToolsProxyConfigBackend } from '@sap-ux/ui5-config';
import { EntitySet, Singleton } from '@sap-ux/vocabularies-types';

export type SemanticKeyFilter = { name: string; type: string; value: string | undefined };

export type ReferencedEntities = {
    listEntity: {
        entitySetName: string;
        semanticKeys: SemanticKeyFilter[];
    };
    pageObjectEntities?: Entity[];
    navPropEntities?: Map<Entity, Entity[]>;
};
export type Entity = { entitySetName: string; entityPath: string; entitySet: EntitySet | Singleton };

// todo: consolidate this and AppConfig
export type AppConfig = {
    appAccess?: ApplicationAccess;
    referencedEntities?: ReferencedEntities;
    // servicePaths: string[];
    /**
     * Main service path
     */
    servicePath?: string;
    backendConfig?: FioriToolsProxyConfigBackend;
    /**
     * If the system url + client read from the backend config is available from the system store the matching name will be used to pre-select
     */
    systemName?: { value?: string };
};


export const navPropNameExclusions = ['DraftAdministrativeData', 'SiblingEntity'];

