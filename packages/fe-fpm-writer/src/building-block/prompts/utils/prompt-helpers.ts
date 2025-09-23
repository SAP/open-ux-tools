import type { NavigationProperty, Property, EntitySet } from '@sap-ux/vocabularies-types';
import { bindingContextRelative } from '../../types';
import type { PromptContext } from '../../../prompts/types';
import { getEntitySets } from './service';

/**
 * Loads entity sets from cache or fetches them for the given context.
 */
let cachedEntitySets: EntitySet[] | undefined;

/**
 * Loads and caches entity sets for the given prompt context.
 *
 * @param context - The prompt context containing project and appId information.
 * @returns A promise that resolves to an array of EntitySet objects.
 * @throws If the project is undefined or empty.
 */
export async function loadEntitySets(context: PromptContext): Promise<EntitySet[]> {
    const { project, appId } = context;
    if (!project || Object.keys(project).length === 0) {
        throw new Error('Project is undefined. Cannot fetch entity sets.');
    }
    
    cachedEntitySets ??= await getEntitySets(project, appId);
    return cachedEntitySets;
}

/**
 * Resolves entity sets or navigation properties based on binding context.
 *
 * @param entitySets - All entity sets in the project
 * @param pageContextEntitySet - The entity set representing the page context (e.g., for an object page).
 * @param bindingContextType - absolute or relative
 * @param filterEntityProperties - Optional list of properties to exclude
 * @returns EntitySet or NavigationProperty objects
 */
export function getEntitySetOptions(
    entitySets: EntitySet[],
    pageContextEntitySet: string,
    bindingContextType?: string,
    filterEntityProperties?: string[]
): (EntitySet | NavigationProperty)[] {
    const contextEntitySet = entitySets.find((entitySet) => entitySet.name === pageContextEntitySet);

    // List all entity sets if no matching entity set found for the page context
    if (!contextEntitySet) {
        return entitySets;
    }

    // If the binding context is relative, returns all non-collection navigation properties,
    // optionally excluding those specified in filterEntityProperties.
    if (bindingContextType === bindingContextRelative) {
        let navigationProperties =
            contextEntitySet?.entityType?.navigationProperties?.filter((navProp) => navProp.isCollection === false) ??
            [];

        if (filterEntityProperties && filterEntityProperties.length > 0) {
            navigationProperties = navigationProperties.filter(
                (navProp) => !filterEntityProperties.includes(navProp.name)
            );
        }
        return navigationProperties;
    }

    // For absolute context, return the entity set
    return [contextEntitySet];
}

/**
 * Resolves entity properties for a selected entity set or via a relative navigation property.
 *
 * @param entitySets - All entity sets in the project
 * @param pageContextEntitySet - The entity set representing the page context (e.g., for an object page).
 * @param bindingContextType - absolute or relative
 * @param selectedContext - Currently selected navigation property (for relative) or Currently selected entity set (for absolute)
 * @returns Array of Properties
 */
export function resolveEntitySetTargets(
    entitySets: EntitySet[],
    pageContextEntitySet: string,
    bindingContextType?: string,
    selectedContext?: string
): Property[] {
    const entitySet = entitySets.find((es) => es.name === pageContextEntitySet);

    // Return an empty list if no context (entity set or navigation property) has been selected yet by the user
    if (!selectedContext) {
        return [];
    }

    // If the binding context is relative, finds the navigation property and returns the properties of its target entity set.
    if (bindingContextType === bindingContextRelative && selectedContext) {
        const navProp = entitySet?.entityType?.navigationProperties?.find((np) => np.name === selectedContext);
        const targetEntitySet = entitySets.find((es) => es.entityTypeName === navProp?.targetTypeName);
        return targetEntitySet?.entityType?.entityProperties ?? [];
    }

    // Otherwise, return properties of the selected entity set
    return entitySet?.entityType?.entityProperties ?? [];
}
