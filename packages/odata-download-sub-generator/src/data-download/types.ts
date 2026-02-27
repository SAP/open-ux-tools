import type { ApplicationAccess } from '@sap-ux/project-access';
import type { FioriToolsProxyConfigBackend } from '@sap-ux/ui5-config';
import type { EntityType } from '@sap-ux/vocabularies-types';
import type { Specification } from '@sap/ux-specification/dist/types/src';
import type { PageV4 } from '@sap/ux-specification/dist/types/src/v4';
import type { Answers, CheckboxChoiceOptions } from 'inquirer';
import type { EntitySetsFlat } from './odata-query';

export type SemanticKeyFilter = { name: string; type: string; value: string | undefined };

export type ReferencedEntities = {
    listEntity: Entity & {
        semanticKeys: SemanticKeyFilter[]; // The query filters for the list entity
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

/**
 * Type to manage application configuration state.
 */
export type AppConfig = {
    appAccess?: ApplicationAccess;
    specification?: Specification;
    referencedEntities?: ReferencedEntities;
    /**
     * Main service path
     */
    servicePath?: string;
    backendConfig?: FioriToolsProxyConfigBackend;
    /**
     * If the system url + client read from the backend config is available from the system store the matching name will be used to pre-select
     */
    systemName?: { value?: string; connectPath?: string }; // todo: type from osi
    relatedEntityChoices: {
        choices: CheckboxChoiceOptions<Answers>[];
        entitySetsFlat: EntitySetsFlat;
    };
};

export const navPropNameExclusions = ['DraftAdministrativeData', 'SiblingEntity'];
export const entityTypeExclusions = ['I_DraftAdministrativeData'];
