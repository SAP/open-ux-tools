// Serves one mock data folder with the SAP Fiori elements mockserver at /contract and prints the port on stdout.
// It runs in its own Node process because the mockserver loads ES modules through require, which the Jest
// module loader cannot do. Usage: node mockserver-contract-server.mjs FOLDER (FOLDER holds metadata.xml).
import { createServer } from 'node:http';
import { join } from 'node:path';
import mockserverModule from '@sap-ux/fe-mockserver-core';

const folder = process.argv[2];
if (!folder) {
    throw new TypeError('Usage: mockserver-contract-server.mjs FOLDER');
}
// The package is CommonJS with an ES default export, so the class is the default of its exports object.
const FEMockserver = mockserverModule.default ?? mockserverModule;
const mockserver = new FEMockserver({
    services: [
        {
            urlPath: '/contract',
            metadataPath: join(folder, 'metadata.xml'),
            mockdataPath: folder,
            noETag: true,
            debug: false
        }
    ]
});
await mockserver.isReady;
const server = createServer((request, response) =>
    mockserver.getRouter()(request, response, () => {
        response.statusCode = 404;
        response.end();
    })
);
/**
 * The navigations of an entity type as the mockserver reads them.
 * @param entityType the entity type
 * @returns each navigation's name, cardinality, containment, target type and whether data can fill it
 */
const navigationsOf = (entityType) =>
    entityType.navigationProperties.map(
        ({ name, isCollection, containsTarget, referentialConstraint, targetType }) => ({
            name,
            isCollection,
            containsTarget: containsTarget === true,
            targetType: targetType?.fullyQualifiedName,
            // A constraint that reads a property the source type does not declare matches no target row.
            matchable: (referentialConstraint ?? []).every(({ sourceProperty }) =>
                entityType.entityProperties.some((property) => property.name === sourceProperty)
            )
        })
    );
const metadata = mockserver.getServiceRegistry().getService('/contract')?.getMetadata();
// The entity sets as the mockserver reads them: keys, navigations and whether Fiori elements treats them as draft.
const entitySets = (metadata?.getEntitySets() ?? []).map((entitySet) => ({
    name: entitySet.name,
    type: entitySet.entityType.fullyQualifiedName,
    keys: entitySet.entityType.keys.map(({ name, type }) => ({ name, type })),
    navigations: navigationsOf(entitySet.entityType),
    draft:
        entitySet.annotations?.Common?.DraftRoot !== undefined ||
        entitySet.annotations?.Common?.DraftNode !== undefined,
    // A parametrized set (`Common.ResultContext`) cannot be listed: an app reads it by its parameters only.
    parametrized: entitySet.entityType.annotations?.Common?.ResultContext !== undefined
}));
// The entity types contained in another, by qualified name: their rows live in the row that contains them.
const containedTypes = {};
const pending = (metadata?.getEntitySets() ?? []).map(({ entityType }) => entityType);
while (pending.length > 0) {
    const entityType = pending.pop();
    for (const { containsTarget, targetType } of entityType.navigationProperties) {
        if (containsTarget === true && targetType && !(targetType.fullyQualifiedName in containedTypes)) {
            containedTypes[targetType.fullyQualifiedName] = {
                name: targetType.fullyQualifiedName,
                keys: targetType.keys.map(({ name, type }) => ({ name, type })),
                navigations: navigationsOf(targetType)
            };
            pending.push(targetType);
        }
    }
}
server.listen(0, () => {
    process.stdout.write(`${JSON.stringify({ port: server.address().port, entitySets, containedTypes })}\n`);
});
process.on('SIGTERM', () => {
    server.close();
    void mockserver.dispose().then(() => process.exit(0));
});
