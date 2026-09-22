import { generateService } from '../../src/index.js';
import { parseEdmx } from '../../src/schema/edmx.js';
import { arbitrateSemanticClassifications } from '../../src/semantics/lexical-fallback.js';
import type { SemanticClassification } from '../../src/types.js';

const metadata = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
<EntityType Name="Vehicle"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="ManufacturerName" Type="Edm.String" MaxLength="60"/>
<Property Name="ManufacturerURL" Type="Edm.String" MaxLength="200"/>
<Property Name="Mileage" Type="Edm.Int32"/>
<Property Name="MileageUnit" Type="Edm.String" MaxLength="3"/>
<Property Name="Rating" Type="Edm.Decimal" Precision="3" Scale="1"/>
<Property Name="RatingText" Type="Edm.String" MaxLength="40"/>
<Property Name="CreditRating" Type="Edm.Int32"/>
</EntityType>
<EntityType Name="Node"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="DistanceFromRoot" Type="Edm.Int32"/>
</EntityType>
<EntityContainer Name="Container"><EntitySet Name="Vehicles" EntityType="Demo.Vehicle"/><EntitySet Name="Nodes" EntityType="Demo.Node"/></EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;

/** A classifier decision that offers nothing, so only metadata and name rules can decide. */
function noClassifierAnswer(): SemanticClassification {
    return { role: 'unknown', confidence: 0.99, source: 'classifier', routeThreshold: 1.01 };
}

function arbitrated(): ReadonlyMap<string, SemanticClassification> {
    const graph = parseEdmx(metadata);
    const keys = graph.entities.flatMap((entity) =>
        entity.properties.map((property) => `${entity.entitySetName}.${property.name}`)
    );
    return arbitrateSemanticClassifications(graph, new Map(keys.map((key) => [key, noClassifierAnswer()])));
}

describe('manufacturer, distance and rating roles', () => {
    it('routes each concept from an unambiguous column name of the right type', () => {
        const result = arbitrated();
        expect(result.get('Vehicles.ManufacturerName')).toMatchObject({
            role: 'manufacturer',
            source: 'lexical-fallback'
        });
        expect(result.get('Vehicles.Mileage')).toMatchObject({ role: 'distance', source: 'lexical-fallback' });
        expect(result.get('Vehicles.Rating')).toMatchObject({ role: 'rating', source: 'lexical-fallback' });
    });

    it('leaves the neighbours the adjudication panel labelled differently alone', () => {
        const result = arbitrated();
        // The panel labelled these `url`, `unit_of_measure`, `description`, `credit_rating` and
        // `unknown`; a name rule must not claim them for the new roles.
        for (const key of [
            'Vehicles.ManufacturerURL',
            'Vehicles.MileageUnit',
            'Vehicles.RatingText',
            'Vehicles.CreditRating',
            'Nodes.DistanceFromRoot'
        ]) {
            expect(['manufacturer', 'distance', 'rating']).not.toContain(result.get(key)?.role);
        }
    });

    it('produces plausible values for each role', async () => {
        const result = await generateService(
            {
                metadata: { format: 'edmx', content: metadata },
                service: { urlPath: '/fleet', odataVersion: '4.0' },
                targets: [{ name: 'Vehicles', kind: 'entity-set' }],
                existingData: {}
            },
            { pipeline: 'semantic-v2', mode: 'deterministic', seed: 7, rowsPerEntity: 5 }
        );
        for (const row of result.resources.Vehicles) {
            expect(typeof row.ManufacturerName).toBe('string');
            expect(String(row.ManufacturerName).length).toBeGreaterThan(0);
            expect(row.Mileage).toBeGreaterThanOrEqual(1);
            expect(row.Mileage).toBeLessThanOrEqual(5000);
            expect(row.Rating).toBeGreaterThanOrEqual(1);
            expect(row.Rating).toBeLessThanOrEqual(5);
        }
        expect(result.semanticRoles?.['Vehicles.ManufacturerName']).toBe('manufacturer');
        expect(result.semanticRoles?.['Vehicles.Mileage']).toBe('distance');
        expect(result.semanticRoles?.['Vehicles.Rating']).toBe('rating');
    });
});
