import type { ApplicationAccess } from '@sap-ux/project-access';
import type { FioriToolsProxyConfigBackend } from '@sap-ux/ui5-config';
import type { EntityType } from '@sap-ux/vocabularies-types';
import type { PageV4 } from '@sap/ux-specification/dist/types/src/v4';

export type SemanticKeyFilter = { name: string; type: string; value: string | undefined };

export type ReferencedEntities = {
    listEntity: Entity & {
        semanticKeys: SemanticKeyFilter[];
    };
    pageObjectEntities?: Entity[];
    navPropEntities?: Map<Entity, Entity[]>;
};
export type Entity = {
    entitySetName: string;
    entityPath: string; // The nav property name (this entity path part)
    entityType: EntityType | undefined;
    page?: PageV4; // The page specification
    navPropEntities?: Entity[];
};

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
export const entityTypeExclusions = ['I_DraftAdministrativeData'];
