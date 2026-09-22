import { generateService, inspectService, validateGeneratedResult } from '../../src/index.js';
import { parseEdmx } from '../../src/schema/edmx.js';
import type { MockDataGeneratorOptions, MockDataServiceRequest } from '../../src/types.js';

// Invented, public-safe service models. Each isolates one schema element that has no generatable
// inline JSON value, so the rest of the service must still be generated.

const semanticV2: MockDataGeneratorOptions = {
    pipeline: 'semantic-v2',
    mode: 'deterministic',
    seed: 7,
    rowsPerEntity: 4
};

function v4(schemaBody: string): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices>
    <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Library" Alias="SELF">
${schemaBody}
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;
}

function request(content: string, targets: ReadonlyArray<string>): MockDataServiceRequest {
    return {
        metadata: { format: 'edmx', content },
        service: { urlPath: '/library/', odataVersion: '4.0' },
        targets: targets.map((name) => ({ name, kind: 'entity-set' as const })),
        existingData: {}
    };
}

describe('properties without a generatable inline JSON value', () => {
    const mediaMetadata = v4(`
      <EntityType Name="Attachment">
        <Key><PropertyRef Name="AttachmentID"/></Key>
        <Property Name="AttachmentID" Type="Edm.Guid" Nullable="false"/>
        <Property Name="FileName" Type="Edm.String" MaxLength="80"/>
        <Property Name="Content" Type="Edm.Stream"/>
        <Property Name="Location" Type="Edm.GeographyPoint"/>
        <Property Name="Retention" Type="Edm.Duration"/>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="Attachments" EntityType="Library.Attachment"/>
      </EntityContainer>`);

    it('omits stream, geospatial and duration properties and keeps the entity set', async () => {
        // Given an entity type with a media stream, a geography point and a duration
        const serviceRequest = request(mediaMetadata, ['Attachments']);

        // When the service is generated through the semantic pipeline
        const result = await generateService(serviceRequest, semanticV2);

        // Then every row carries only the generatable properties
        expect(result.resources.Attachments).toHaveLength(4);
        for (const row of result.resources.Attachments ?? []) {
            expect(Object.keys(row).sort()).toEqual(['AttachmentID', 'FileName']);
        }
        // And each omitted property is reported without failing validation
        const omitted = result.diagnostics.filter(({ code }) => code === 'SCHEMA_PROPERTY_OMITTED');
        expect(omitted.map(({ target, severity }) => [target, severity])).toEqual([
            ['Attachments.Content', 'info'],
            ['Attachments.Location', 'info'],
            ['Attachments.Retention', 'info']
        ]);
        expect(() => validateGeneratedResult(serviceRequest, result, semanticV2)).not.toThrow();
    });

    it('lists the omitted properties as unsupported schema elements in the inspection', async () => {
        // Given the same media entity
        // When the generation is inspected
        const report = await inspectService(request(mediaMetadata, ['Attachments']), semanticV2);

        // Then the omitted properties are visible with their declared types
        expect(
            report.unsupportedSchemaElements.filter(({ kind }) => kind === 'unsupported-type').map(({ path }) => path)
        ).toEqual(['Attachments.Content', 'Attachments.Location', 'Attachments.Retention']);
    });

    it('generates enumeration-typed properties from the declared member names', async () => {
        // Given an EnumType referenced through the schema alias
        const content = v4(`
      <EnumType Name="Availability">
        <Member Name="OnShelf" Value="0"/>
        <Member Name="Borrowed" Value="1"/>
        <Member Name="Archived" Value="2"/>
      </EnumType>
      <EntityType Name="Book">
        <Key><PropertyRef Name="BookID"/></Key>
        <Property Name="BookID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="Availability" Type="SELF.Availability" Nullable="false"/>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="Books" EntityType="Library.Book"/>
      </EntityContainer>`);

        // When the service is generated
        const result = await generateService(request(content, ['Books']), semanticV2);

        // Then every value is one of the member names, as OData JSON serializes enumeration values
        const values = (result.resources.Books ?? []).map(({ Availability }) => Availability);
        expect(values).toHaveLength(4);
        expect(values.every((value) => ['OnShelf', 'Borrowed', 'Archived'].includes(String(value)))).toBe(true);
    });
});

describe('entity sets whose rows cannot be generated', () => {
    const danglingMetadata = v4(`
      <EntityType Name="Shelf">
        <Key><PropertyRef Name="ShelfID"/></Key>
        <Property Name="ShelfID" Type="Edm.String" MaxLength="4" Nullable="false"/>
        <Property Name="Label" Type="Edm.String" MaxLength="40"/>
      </EntityType>
      <EntityType Name="Scan">
        <Key><PropertyRef Name="Image"/></Key>
        <Property Name="Image" Type="Edm.Stream" Nullable="false"/>
      </EntityType>
      <EntityType Name="Loan">
        <Key><PropertyRef Name="LoanID"/></Key>
        <Property Name="LoanID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="ShelfID" Type="Edm.String" MaxLength="4"/>
        <Property Name="ReaderID" Type="Edm.Int32"/>
        <NavigationProperty Name="shelf" Type="Library.Shelf">
          <ReferentialConstraint Property="ShelfID" ReferencedProperty="ShelfID"/>
        </NavigationProperty>
        <NavigationProperty Name="reader" Type="Elsewhere.Reader">
          <ReferentialConstraint Property="ReaderID" ReferencedProperty="ReaderID"/>
        </NavigationProperty>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="Shelves" EntityType="Library.Shelf"/>
        <EntitySet Name="Scans" EntityType="Library.Scan"/>
        <EntitySet Name="Readers" EntityType="Elsewhere.Reader"/>
        <EntitySet Name="Loans" EntityType="Library.Loan">
          <NavigationPropertyBinding Path="shelf" Target="Shelves"/>
          <NavigationPropertyBinding Path="reader" Target="Readers"/>
        </EntitySet>
      </EntityContainer>`);

    it('records the unresolvable entity sets and drops relationships into them', () => {
        // Given one set of an undeclared type and one whose only key is a stream
        // When the metadata is parsed
        const graph = parseEdmx(danglingMetadata);

        // Then only those two sets are skipped, each with its reason
        expect(graph.entities.map(({ entitySetName }) => entitySetName)).toEqual(['Loans', 'Shelves']);
        expect(graph.skippedEntitySets).toEqual([
            {
                entitySetName: 'Readers',
                reason: 'entity type Elsewhere.Reader is not declared in the metadata document'
            },
            { entitySetName: 'Scans', reason: 'key Image has type Edm.Stream, which has no generatable value' }
        ]);
        // And the relationship into the declared set survives
        expect(graph.relationships.map(({ name, toEntitySet }) => `${name}->${toEntitySet}`)).toEqual([
            'shelf->Shelves'
        ]);
    });

    it('skips an entity set whose type inherits from itself', () => {
        // Given two entity types that name each other as base type
        const content = v4(`
      <EntityType Name="Folder" BaseType="Library.Archive">
        <Key><PropertyRef Name="FolderID"/></Key>
        <Property Name="FolderID" Type="Edm.Int32" Nullable="false"/>
      </EntityType>
      <EntityType Name="Archive" BaseType="Library.Folder">
        <Property Name="Label" Type="Edm.String" MaxLength="20"/>
      </EntityType>
      <EntityType Name="Shelf">
        <Key><PropertyRef Name="ShelfID"/></Key>
        <Property Name="ShelfID" Type="Edm.String" MaxLength="4" Nullable="false"/>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="Folders" EntityType="Library.Folder"/>
        <EntitySet Name="Shelves" EntityType="Library.Shelf"/>
      </EntityContainer>`);

        // When the metadata is parsed
        const graph = parseEdmx(content);

        // Then only the set with the cyclic hierarchy is skipped
        expect(graph.entities.map(({ entitySetName }) => entitySetName)).toEqual(['Shelves']);
        expect(graph.skippedEntitySets).toEqual([
            { entitySetName: 'Folders', reason: 'entity inheritance contains a cycle at Library.Folder' }
        ]);
    });

    it('generates the other requested sets and reports the skipped ones', async () => {
        // Given every declared entity set is requested, as the data editor does
        const serviceRequest = request(danglingMetadata, ['Shelves', 'Scans', 'Readers', 'Loans']);

        // When the service is generated
        const result = await generateService(serviceRequest, semanticV2);

        // Then the resolvable sets have rows that reference each other
        expect(Object.keys(result.resources).sort()).toEqual(['Loans', 'Shelves']);
        const shelves = new Set((result.resources.Shelves ?? []).map(({ ShelfID }) => ShelfID));
        expect(result.resources.Loans?.every(({ ShelfID }) => ShelfID === null || shelves.has(ShelfID))).toBe(true);
        // And each skipped target carries a warning instead of aborting the service
        expect(
            result.diagnostics
                .filter(({ code }) => code === 'SCHEMA_ENTITY_SET_SKIPPED')
                .map(({ target, severity }) => [target, severity])
        ).toEqual([
            ['Readers', 'warning'],
            ['Scans', 'warning']
        ]);
        expect(() => validateGeneratedResult(serviceRequest, result, semanticV2)).not.toThrow();
    });

    it('rejects a result that silently omits a skipped target', async () => {
        // Given a generated result for a request with a skipped target
        const serviceRequest = request(danglingMetadata, ['Shelves', 'Readers']);
        const result = await generateService(serviceRequest, semanticV2);

        // When the skip diagnostic is removed before validation
        const unreported = {
            ...result,
            diagnostics: result.diagnostics.filter(({ code }) => code !== 'SCHEMA_ENTITY_SET_SKIPPED')
        };

        // Then validation refuses the result
        expect(() => validateGeneratedResult(serviceRequest, unreported, semanticV2)).toThrow(
            'Skipped target Readers is not reported in the diagnostics'
        );
    });

    it('still rejects a target the schema does not declare at all', async () => {
        // Given a target that names no entity set in the metadata
        const serviceRequest = request(danglingMetadata, ['Shelves', 'Missing']);

        // When the service is generated
        // Then the request is refused as before
        await expect(generateService(serviceRequest, semanticV2)).rejects.toThrow(
            'Generated target Missing is not declared by the service schema'
        );
    });
});

describe('malformed references inside a declared entity type', () => {
    it('drops a relationship whose constraint names a property the entity does not declare', async () => {
        // Given a navigation whose referential constraint names a property of the partner entity
        const content = v4(`
      <EntityType Name="Plan">
        <Key><PropertyRef Name="ID"/></Key>
        <Property Name="ID" Type="Edm.Guid" Nullable="false"/>
        <Property Name="policy_ID" Type="Edm.Guid"/>
        <NavigationProperty Name="policy" Type="Library.Policy">
          <ReferentialConstraint Property="policy_ID" ReferencedProperty="ID"/>
        </NavigationProperty>
      </EntityType>
      <EntityType Name="Policy">
        <Key><PropertyRef Name="ID"/></Key>
        <Property Name="ID" Type="Edm.Guid" Nullable="false"/>
        <Property Name="Title" Type="Edm.String" MaxLength="40"/>
        <NavigationProperty Name="plan" Type="Library.Plan">
          <ReferentialConstraint Property="policy_ID" ReferencedProperty="ID"/>
        </NavigationProperty>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="Plans" EntityType="Library.Plan">
          <NavigationPropertyBinding Path="policy" Target="Policies"/>
        </EntitySet>
        <EntitySet Name="Policies" EntityType="Library.Policy">
          <NavigationPropertyBinding Path="plan" Target="Plans"/>
        </EntitySet>
      </EntityContainer>`);
        const serviceRequest = request(content, ['Plans', 'Policies']);

        // When the service is generated
        const result = await generateService(serviceRequest, semanticV2);

        // Then policy rows carry only their declared properties and the valid link survives
        expect(parseEdmx(content).relationships.map(({ fromEntitySet, name }) => `${fromEntitySet}.${name}`)).toEqual([
            'Plans.policy'
        ]);
        expect((result.resources.Policies ?? []).every((row) => Object.keys(row).sort().join() === 'ID,Title')).toBe(
            true
        );
        expect(() => validateGeneratedResult(serviceRequest, result, semanticV2)).not.toThrow();
    });

    it('ignores a blank key reference and keeps the declared keys', () => {
        // Given a key whose third property reference is blank
        const content = v4(`
      <EntityType Name="Account">
        <Key><PropertyRef Name="Holder"/><PropertyRef Name="Branch"/><PropertyRef Name=" "/></Key>
        <Property Name="Holder" Type="Edm.String" MaxLength="10" Nullable="false"/>
        <Property Name="Branch" Type="Edm.String" MaxLength="4" Nullable="false"/>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="Accounts" EntityType="Library.Account"/>
      </EntityContainer>`);

        // When the metadata is parsed
        const [accounts] = parseEdmx(content).entities;

        // Then the declared key properties remain the entity key
        expect(accounts?.properties.filter(({ isKey }) => isKey).map(({ name }) => name)).toEqual(['Holder', 'Branch']);
    });
});

describe('invalid facets', () => {
    it('treats a decimal precision of zero as unspecified', async () => {
        // Given a decimal counter whose declared precision admits no digit
        const content = v4(`
      <EntityType Name="Queue">
        <Key><PropertyRef Name="QueueID"/></Key>
        <Property Name="QueueID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="EntryCounter" Type="Edm.Decimal" Precision="0" Scale="0" Nullable="false"/>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="Queues" EntityType="Library.Queue"/>
      </EntityContainer>`);
        const serviceRequest = request(content, ['Queues']);

        // When the service is generated
        const result = await generateService(serviceRequest, semanticV2);

        // Then the counter holds whole numbers and the result validates
        expect(parseEdmx(content).entities[0]?.properties.find(({ name }) => name === 'EntryCounter')?.precision).toBe(
            undefined
        );
        expect((result.resources.Queues ?? []).every(({ EntryCounter }) => Number.isInteger(EntryCounter))).toBe(true);
        expect(() => validateGeneratedResult(serviceRequest, result, semanticV2)).not.toThrow();
    });
});
