import type { Manifest } from 'sap/ui/rta/RuntimeAuthoring';

interface V2ManifestPageDefinition {
    component: {
        name: string;
    };
    entitySet: string;
    pages?: Record<string, V2ManifestPageDefinition> | Array<V2ManifestPageDefinition>;
}

const OBJECT_PAGE_COMPONENT_NAME = 'sap.suite.ui.generic.template.ObjectPage';

/**
 * Returns application object page definitions found in manifest
 *
 * @param manifest - manifest object
 * @returns array with page descriptors
 */
export function getV2ApplicationPages(manifest: Manifest): { id: string; entitySet: string | undefined }[] {
    // do we need to distinguish both navigation source and target entitySets to differentiate alternative routes?
    const rootEntry = manifest['sap.ui.generic.app'] || manifest['sap.ovp'];
    if (rootEntry) {
        const result: { id: string; entitySet: string | undefined }[] = [];

        const collectPageData = <
            T extends Record<string, V2ManifestPageDefinition> | Array<V2ManifestPageDefinition>
        >(
            pagesDefinitions: T | undefined,
            idPrefix: string
        ) => {
            if (!pagesDefinitions) {
                return;
            }

            if (Array.isArray(pagesDefinitions)) {
                pagesDefinitions.forEach((entry, idx) => {
                    const id = `${idPrefix}-${idx}`;
                    if (entry.component.name === OBJECT_PAGE_COMPONENT_NAME) {
                        result.push({
                            id,
                            entitySet: entry.entitySet
                        });
                    }
                    collectPageData(entry.pages, id);
                });
            } else {
                const pageIds = Object.keys(pagesDefinitions);
                for (const pageId of pageIds) {
                    if (pagesDefinitions[pageId].component.name === OBJECT_PAGE_COMPONENT_NAME) {
                        result.push({
                            id: pageId,
                            entitySet: pagesDefinitions[pageId].entitySet
                        });
                    }
                    collectPageData(pagesDefinitions[pageId].pages, idPrefix);
                }
            }
        };
        collectPageData(rootEntry.pages, 'page');
        return result;
    }
    return [];
}
