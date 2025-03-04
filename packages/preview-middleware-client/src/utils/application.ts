import type { Manifest } from 'sap/ui/rta/RuntimeAuthoring';

export type ApplicationType = 'fe-v2' | 'fe-v4' | 'freestyle';

interface V2_ManifestPageDefinition {
    component: {
        name: string;
    };
    entitySet: string;
    pages?: Record<string, V2_ManifestPageDefinition> | Array<V2_ManifestPageDefinition>;
}

const OBJECT_PAGE_COMPONENT_NAME = 'sap.suite.ui.generic.template.ObjectPage';

/**
 * Determines application type based on the manifest.json.
 *
 * @param manifest - Application Manifest.
 * @returns Application type.
 */
export function getApplicationType(manifest: Manifest): ApplicationType {
    if (manifest['sap.ui.generic.app'] || manifest['sap.ovp']) {
        return 'fe-v2';
    } else if (manifest['sap.ui5']?.routing?.targets) {
        let hasV4pPages = false;
        Object.keys(manifest?.['sap.ui5']?.routing?.targets ?? []).forEach((target) => {
            if (manifest?.['sap.ui5']?.routing?.targets?.[target]?.name?.startsWith('sap.fe.templates.')) {
                hasV4pPages = true;
            }
        });
        if (hasV4pPages) {
            return 'fe-v4';
        }
    }

    return 'freestyle';
}

/**
 * Returns application object page definitions found in manifest
 *
 * @param manifest - manifest object
 * @returns array with page descriptors
 */
export function getApplicationPages(manifest: Manifest): { id: string; entitySet: string | undefined }[] {
    // TODO: do we need to distinguish both navigation source and target entitySets to differentiate alternative routes?
    const v2PagesContainer = manifest['sap.ui.generic.app'] || manifest['sap.ovp'];
    if (v2PagesContainer) {
        const result: { id: string; entitySet: string | undefined }[] = [];

        const collectPageData = <
            T extends Record<string, V2_ManifestPageDefinition> | Array<V2_ManifestPageDefinition>
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
        collectPageData(v2PagesContainer.pages, 'page');
        return result;
    } else if (manifest['sap.ui5']?.routing?.targets) {
        const targets = manifest['sap.ui5'].routing?.targets ?? {};
        const result = Object.keys(targets).map((key) => {
            const entitySet = targets[key].options?.settings?.entitySet;
            const id = targets[key].id;
            return { id, entitySet };
        });
        return result;
    }
    return [];
}
