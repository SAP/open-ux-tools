import { generateService, validateGeneratedResult } from '../../src/index.js';
import { propertyValueIsValid } from '../../src/generation/constraints.js';
import { parseEdmx } from '../../src/schema/edmx.js';
import type {
    MockDataGeneratorOptions,
    MockDataGeneratorRuntime,
    MockDataRow,
    MockDataServiceRequest,
    SemanticClassification
} from '../../src/types.js';

// Invented, public-safe service models. Each reproduces one way a value copied from another field
// used to violate the receiving field's own facets, role or key invariant.

const semanticV2: MockDataGeneratorOptions = {
    pipeline: 'semantic-v2',
    mode: 'deterministic',
    seed: 3,
    rowsPerEntity: 6
};

function v4(schemaBody: string, annotations = ''): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices>
    <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Club">
${schemaBody}
${annotations}
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;
}

function request(content: string, targets: ReadonlyArray<string>): MockDataServiceRequest {
    return {
        metadata: { format: 'edmx', content },
        service: { urlPath: '/club/', odataVersion: '4.0' },
        targets: targets.map((name) => ({ name, kind: 'entity-set' as const })),
        existingData: {}
    };
}

function column(rows: ReadonlyArray<MockDataRow> | undefined, name: string): ReadonlyArray<unknown> {
    return (rows ?? []).map((row) => row[name]);
}

function expectFacetValid(content: string, resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>): void {
    for (const entity of parseEdmx(content).entities) {
        for (const row of resources[entity.entitySetName] ?? []) {
            for (const property of entity.properties) {
                expect([
                    entity.entitySetName,
                    property.name,
                    propertyValueIsValid(property, row[property.name])
                ]).toEqual([entity.entitySetName, property.name, true]);
            }
        }
    }
}

/**
 * A classifier stub that routes only the named fields and abstains everywhere else.
 *
 * @param roles - Property name to routed role.
 * @returns A runtime whose classifier returns the given roles with full confidence.
 */
function classifierRuntime(roles: Readonly<Record<string, string>>): MockDataGeneratorRuntime {
    return {
        classifier: {
            fingerprint: 'bound-value-facets-test',
            classify: async (input): Promise<SemanticClassification> =>
                roles[input.propertyName]
                    ? { role: roles[input.propertyName], confidence: 1, source: 'classifier' }
                    : { role: 'unknown', confidence: 1, source: 'unknown', top: [{ role: 'unknown', confidence: 1 }] }
        }
    };
}

describe('foreign keys narrower than the key they reference', () => {
    const statusMetadata = v4(`
      <EntityType Name="StatusCode">
        <Key><PropertyRef Name="Code"/></Key>
        <Property Name="Code" Type="Edm.String" MaxLength="10" Nullable="false"/>
        <Property Name="Title" Type="Edm.String" MaxLength="40"/>
      </EntityType>
      <EntityType Name="Membership">
        <Key><PropertyRef Name="MembershipID"/></Key>
        <Property Name="MembershipID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="Status" Type="Edm.String" MaxLength="1"/>
        <NavigationProperty Name="status" Type="Club.StatusCode">
          <ReferentialConstraint Property="Status" ReferencedProperty="Code"/>
        </NavigationProperty>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="StatusCodes" EntityType="Club.StatusCode"/>
        <EntitySet Name="Memberships" EntityType="Club.Membership">
          <NavigationPropertyBinding Path="status" Target="StatusCodes"/>
        </EntitySet>
      </EntityContainer>`);

    it('generates the referenced key inside the foreign key facets and keeps the link', async () => {
        // Given a one-character status that references a ten-character code key
        const serviceRequest = request(statusMetadata, ['StatusCodes', 'Memberships']);

        // When the service is generated
        const result = await generateService(serviceRequest, semanticV2);

        // Then every status is a one-character code that exists in the referenced set
        const codes = new Set(column(result.resources.StatusCodes, 'Code'));
        const statuses = column(result.resources.Memberships, 'Status');
        expect(statuses).toHaveLength(6);
        expect(statuses.every((status) => typeof status === 'string' && status.length === 1 && codes.has(status))).toBe(
            true
        );
        expectFacetValid(statusMetadata, result.resources);
        expect(() => validateGeneratedResult(serviceRequest, result, semanticV2)).not.toThrow();
    });

    it('leaves a nullable foreign key empty when no referenced value fits its type', async () => {
        // Given a GUID foreign key that references a free-form string key
        const content = v4(`
      <EntityType Name="Locker">
        <Key><PropertyRef Name="LockerRef"/></Key>
        <Property Name="LockerRef" Type="Edm.String" Nullable="false"/>
      </EntityType>
      <EntityType Name="Booking">
        <Key><PropertyRef Name="BookingID"/></Key>
        <Property Name="BookingID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="LockerRef" Type="Edm.Guid"/>
        <NavigationProperty Name="locker" Type="Club.Locker">
          <ReferentialConstraint Property="LockerRef" ReferencedProperty="LockerRef"/>
        </NavigationProperty>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="Lockers" EntityType="Club.Locker"/>
        <EntitySet Name="Bookings" EntityType="Club.Booking">
          <NavigationPropertyBinding Path="locker" Target="Lockers"/>
        </EntitySet>
      </EntityContainer>`);
        const serviceRequest = request(content, ['Lockers', 'Bookings']);

        // When the service is generated
        const result = await generateService(serviceRequest, semanticV2);

        // Then the GUID never receives a non-GUID key, and the rows are kept
        expect(column(result.resources.Bookings, 'LockerRef')).toEqual([null, null, null, null, null, null]);
        expect(() => validateGeneratedResult(serviceRequest, result, semanticV2)).not.toThrow();
    });
});

describe('binary typed floor', () => {
    it('keeps the encoded value within the declared MaxLength', async () => {
        // Given binary fields shorter than the base64 text of the placeholder payload
        const content = v4(`
      <EntityType Name="Badge">
        <Key><PropertyRef Name="BadgeID"/></Key>
        <Property Name="BadgeID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="Flags" Type="Edm.Binary" MaxLength="2" Nullable="false"/>
        <Property Name="PathRef" Type="Edm.Binary" MaxLength="20"/>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="Badges" EntityType="Club.Badge"/>
      </EntityContainer>`);
        const serviceRequest = request(content, ['Badges']);

        // When the service is generated
        const result = await generateService(serviceRequest, semanticV2);

        // Then every value is base64 no longer than its facet
        expectFacetValid(content, result.resources);
        expect(
            column(result.resources.Badges, 'PathRef').every(
                (value) => typeof value === 'string' && value.length > 0 && value.length <= 20
            )
        ).toBe(true);
    });
});

describe('derived count fields', () => {
    it('never overwrite key properties with a derived count', async () => {
        // Given value helps whose keys look like counts but have no modeled child domain
        const content = v4(`
      <EntityType Name="SeatCountHelp">
        <Key><PropertyRef Name="NumberOfSeats"/></Key>
        <Property Name="NumberOfSeats" Type="Edm.String" MaxLength="1" Nullable="false"/>
        <Property Name="Description" Type="Edm.String" MaxLength="20"/>
      </EntityType>
      <EntityType Name="Tally">
        <Key><PropertyRef Name="CountOpenItems"/><PropertyRef Name="CountClosedItems"/></Key>
        <Property Name="CountOpenItems" Type="Edm.Int32" Nullable="false"/>
        <Property Name="CountClosedItems" Type="Edm.Int32" Nullable="false"/>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="SeatCountHelps" EntityType="Club.SeatCountHelp"/>
        <EntitySet Name="Tallies" EntityType="Club.Tally"/>
      </EntityContainer>`);
        const serviceRequest = request(content, ['SeatCountHelps', 'Tallies']);

        // When the service is generated
        const result = await generateService(serviceRequest, semanticV2);

        // Then the keys stay unique
        expect(new Set(column(result.resources.SeatCountHelps, 'NumberOfSeats')).size).toBe(6);
        expect(
            new Set((result.resources.Tallies ?? []).map((row) => `${row.CountOpenItems}/${row.CountClosedItems}`)).size
        ).toBe(6);
        expect(() => validateGeneratedResult(serviceRequest, result, semanticV2)).not.toThrow();
    });
});

describe('derived child-domain alignment', () => {
    it('does not overwrite a foreign key that an explicit relationship already assigned', async () => {
        // Given a slot that references a team explicitly and is also a roster's derived child
        const content = v4(`
      <EntityType Name="Team">
        <Key><PropertyRef Name="TeamKey"/></Key>
        <Property Name="TeamKey" Type="Edm.String" MaxLength="8" Nullable="false"/>
      </EntityType>
      <EntityType Name="Roster">
        <Key><PropertyRef Name="TeamKey"/></Key>
        <Property Name="TeamKey" Type="Edm.String" MaxLength="8" Nullable="false"/>
        <Property Name="NumberOfRosterSlots" Type="Edm.Int32"/>
      </EntityType>
      <EntityType Name="RosterSlot">
        <Key><PropertyRef Name="SlotID"/></Key>
        <Property Name="SlotID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="TeamKey" Type="Edm.String" MaxLength="8" Nullable="false"/>
        <NavigationProperty Name="team" Type="Club.Team" Nullable="false">
          <ReferentialConstraint Property="TeamKey" ReferencedProperty="TeamKey"/>
        </NavigationProperty>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="Teams" EntityType="Club.Team"/>
        <EntitySet Name="Rosters" EntityType="Club.Roster"/>
        <EntitySet Name="RosterSlots" EntityType="Club.RosterSlot">
          <NavigationPropertyBinding Path="team" Target="Teams"/>
        </EntitySet>
      </EntityContainer>`);
        const serviceRequest = request(content, ['Teams', 'Rosters', 'RosterSlots']);

        // When the service is generated
        const result = await generateService(serviceRequest, semanticV2);

        // Then every slot still references an existing team
        const teams = new Set(column(result.resources.Teams, 'TeamKey'));
        expect(column(result.resources.RosterSlots, 'TeamKey').every((team) => teams.has(team))).toBe(true);
        expect(() => validateGeneratedResult(serviceRequest, result, semanticV2)).not.toThrow();
    });

    it('does not overwrite a key that another relationship references', async () => {
        // Given a bin keyed by its site, referenced by picks and aligned as a derived child of sites
        const content = v4(`
      <EntityType Name="Site">
        <Key><PropertyRef Name="SiteID"/></Key>
        <Property Name="SiteID" Type="Edm.String" MaxLength="8" Nullable="false"/>
        <Property Name="NumberOfSiteBins" Type="Edm.Int32"/>
      </EntityType>
      <EntityType Name="SiteBin">
        <Key><PropertyRef Name="SiteID"/></Key>
        <Property Name="SiteID" Type="Edm.String" MaxLength="8" Nullable="false"/>
      </EntityType>
      <EntityType Name="Pick">
        <Key><PropertyRef Name="PickID"/></Key>
        <Property Name="PickID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="SiteID" Type="Edm.String" MaxLength="8" Nullable="false"/>
        <NavigationProperty Name="bin" Type="Club.SiteBin" Nullable="false">
          <ReferentialConstraint Property="SiteID" ReferencedProperty="SiteID"/>
        </NavigationProperty>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="Sites" EntityType="Club.Site"/>
        <EntitySet Name="SiteBins" EntityType="Club.SiteBin"/>
        <EntitySet Name="Picks" EntityType="Club.Pick">
          <NavigationPropertyBinding Path="bin" Target="SiteBins"/>
        </EntitySet>
      </EntityContainer>`);
        const serviceRequest = request(content, ['Sites', 'SiteBins', 'Picks']);

        // When the service is generated
        const result = await generateService(serviceRequest, semanticV2);

        // Then every pick still references an existing bin
        const bins = new Set(column(result.resources.SiteBins, 'SiteID'));
        expect(column(result.resources.Picks, 'SiteID').every((site) => bins.has(site))).toBe(true);
        expect(() => validateGeneratedResult(serviceRequest, result, semanticV2)).not.toThrow();
    });

    it('does not replace a count-named foreign key with a derived count', async () => {
        // Given a visit whose count-named field references a counter key
        const content = v4(`
      <EntityType Name="VisitCounter">
        <Key><PropertyRef Name="VisitCount"/></Key>
        <Property Name="VisitCount" Type="Edm.String" MaxLength="4" Nullable="false"/>
      </EntityType>
      <EntityType Name="Visit">
        <Key><PropertyRef Name="VisitID"/></Key>
        <Property Name="VisitID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="VisitCount" Type="Edm.String" MaxLength="4" Nullable="false"/>
        <NavigationProperty Name="counter" Type="Club.VisitCounter" Nullable="false">
          <ReferentialConstraint Property="VisitCount" ReferencedProperty="VisitCount"/>
        </NavigationProperty>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="VisitCounters" EntityType="Club.VisitCounter"/>
        <EntitySet Name="Visits" EntityType="Club.Visit">
          <NavigationPropertyBinding Path="counter" Target="VisitCounters"/>
        </EntitySet>
      </EntityContainer>`);
        const serviceRequest = request(content, ['VisitCounters', 'Visits']);

        // When the service is generated
        const result = await generateService(serviceRequest, semanticV2);

        // Then every visit references an existing counter
        const counters = new Set(column(result.resources.VisitCounters, 'VisitCount'));
        expect(column(result.resources.Visits, 'VisitCount').every((count) => counters.has(count))).toBe(true);
        expect(() => validateGeneratedResult(serviceRequest, result, semanticV2)).not.toThrow();
    });

    it('does not write a derived count into a field planned with a phone format', async () => {
        // Given a formatted counter classified as a phone number, with no modeled child domain
        const content = v4(
            `
      <EntityType Name="Outreach">
        <Key><PropertyRef Name="OutreachID"/></Key>
        <Property Name="OutreachID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="NumberOfPhoneCalls_F" Type="Edm.String" MaxLength="60"/>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="Outreaches" EntityType="Club.Outreach"/>
      </EntityContainer>`,
            `
      <Annotations Target="Club.Outreach/NumberOfPhoneCalls_F">
        <Annotation Term="com.sap.vocabularies.Common.v1.Label" String="Phone"/>
      </Annotations>`
        );
        const serviceRequest = request(content, ['Outreaches']);
        const options: MockDataGeneratorOptions = { pipeline: 'semantic-v2', seed: 3, rowsPerEntity: 4 };

        // When the service is generated with the phone classification
        const result = await generateService(
            serviceRequest,
            options,
            classifierRuntime({ 'NumberOfPhoneCalls_F': 'phone' })
        );

        // Then the planned phone values are kept instead of a derived zero count
        expect(result.semanticRoles?.['Outreaches.NumberOfPhoneCalls_F']).toBe('phone');
        expect(column(result.resources.Outreaches, 'NumberOfPhoneCalls_F')).not.toContain('0');
        expect(() => validateGeneratedResult(serviceRequest, result, options)).not.toThrow();
    });

    it('reports temporal conflicts that alignment copies from protected parent keys', async () => {
        // Given a parameter set keyed by a date range and a derived child with the same date fields
        const content = v4(`
      <EntityType Name="DayView">
        <Key><PropertyRef Name="P_StartDate"/><PropertyRef Name="P_EndDate"/></Key>
        <Property Name="P_StartDate" Type="Edm.Date" Nullable="false"/>
        <Property Name="P_EndDate" Type="Edm.Date" Nullable="false"/>
        <Property Name="NumberOfEntries" Type="Edm.Int32"/>
      </EntityType>
      <EntityType Name="DayViewEntry">
        <Key><PropertyRef Name="EntryID"/></Key>
        <Property Name="EntryID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="P_StartDate" Type="Edm.Date" Nullable="false"/>
        <Property Name="P_EndDate" Type="Edm.Date" Nullable="false"/>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="DayViews" EntityType="Club.DayView"/>
        <EntitySet Name="DayViewEntries" EntityType="Club.DayViewEntry"/>
      </EntityContainer>`);
        const serviceRequest = request(content, ['DayViews', 'DayViewEntries']);
        const options: MockDataGeneratorOptions = { ...semanticV2, seed: 1 };

        // When the service is generated
        const result = await generateService(serviceRequest, options);

        // Then every row whose dates run backwards is reported for its own entity set
        const backwards = (rows: ReadonlyArray<MockDataRow> | undefined): number =>
            (rows ?? []).filter((row) => String(row.P_StartDate) > String(row.P_EndDate)).length;
        for (const target of ['DayViews', 'DayViewEntries']) {
            const violations = backwards(result.resources[target]);
            const reported = result.diagnostics.filter(
                (diagnostic) => diagnostic.code === 'TEMPORAL_CONSTRAINT_VIOLATION' && diagnostic.target === target
            );
            expect([target, reported.length]).toEqual([target, violations > 0 ? 1 : 0]);
        }
        expect(backwards(result.resources.DayViewEntries)).toBeGreaterThan(0);
        expect(() => validateGeneratedResult(serviceRequest, result, options)).not.toThrow();
    });
});

describe('format roles on fields another field supplies', () => {
    it('withdraws an email role from a foreign key to a user key', async () => {
        // Given a message whose sender references a user key and was classified as an email
        const content = v4(`
      <EntityType Name="Member">
        <Key><PropertyRef Name="MemberID"/></Key>
        <Property Name="MemberID" Type="Edm.String" MaxLength="12" Nullable="false"/>
      </EntityType>
      <EntityType Name="Notice">
        <Key><PropertyRef Name="NoticeID"/></Key>
        <Property Name="NoticeID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="SentBy" Type="Edm.String" MaxLength="12"/>
        <NavigationProperty Name="sender" Type="Club.Member">
          <ReferentialConstraint Property="SentBy" ReferencedProperty="MemberID"/>
        </NavigationProperty>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="Members" EntityType="Club.Member"/>
        <EntitySet Name="Notices" EntityType="Club.Notice">
          <NavigationPropertyBinding Path="sender" Target="Members"/>
        </EntitySet>
      </EntityContainer>`);
        const serviceRequest = request(content, ['Members', 'Notices']);
        const options: MockDataGeneratorOptions = { pipeline: 'semantic-v2', seed: 3, rowsPerEntity: 4 };

        // When the service is generated with the email classification
        const result = await generateService(serviceRequest, options, classifierRuntime({ SentBy: 'email' }));

        // Then the sender keeps the referenced member keys and the role is not claimed
        const members = new Set(column(result.resources.Members, 'MemberID'));
        expect(column(result.resources.Notices, 'SentBy').every((sender) => members.has(sender))).toBe(true);
        expect(result.semanticRoles?.['Notices.SentBy']).toBeUndefined();
        expect(result.diagnostics).toContainEqual(
            expect.objectContaining({ code: 'SEMANTIC_DOMAIN_UNAVAILABLE', target: 'Notices.SentBy' })
        );
        expect(() => validateGeneratedResult(serviceRequest, result, options)).not.toThrow();
    });

    it('withdraws a country role from a value-help parameter whose value-help field is not a country', async () => {
        // Given an account country bound through a value help to an unclassified branch field
        const content = v4(
            `
      <EntityType Name="Branch">
        <Key><PropertyRef Name="BranchKey"/></Key>
        <Property Name="BranchKey" Type="Edm.String" MaxLength="6" Nullable="false"/>
        <Property Name="BranchRegion" Type="Edm.String" MaxLength="3"/>
      </EntityType>
      <EntityType Name="Account">
        <Key><PropertyRef Name="AccountID"/></Key>
        <Property Name="AccountID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="HomeCountry" Type="Edm.String" MaxLength="3"/>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="Branches" EntityType="Club.Branch"/>
        <EntitySet Name="Accounts" EntityType="Club.Account"/>
      </EntityContainer>`,
            `
      <Annotations Target="Club.Account/HomeCountry">
        <Annotation Term="com.sap.vocabularies.Common.v1.ValueList">
          <Record>
            <PropertyValue Property="CollectionPath" String="Branches"/>
            <PropertyValue Property="Parameters">
              <Collection>
                <Record Type="com.sap.vocabularies.Common.v1.ValueListParameterInOut">
                  <PropertyValue Property="LocalDataProperty" PropertyPath="HomeCountry"/>
                  <PropertyValue Property="ValueListProperty" String="BranchRegion"/>
                </Record>
              </Collection>
            </PropertyValue>
          </Record>
        </Annotation>
      </Annotations>`
        );
        const serviceRequest = request(content, ['Branches', 'Accounts']);
        const options: MockDataGeneratorOptions = { pipeline: 'semantic-v2', seed: 3, rowsPerEntity: 4 };

        // When the service is generated with the country classification on the local field only
        const result = await generateService(serviceRequest, options, classifierRuntime({ HomeCountry: 'country' }));

        // Then the local field takes the value-help values and does not claim the country role
        const regions = new Set(column(result.resources.Branches, 'BranchRegion'));
        expect(column(result.resources.Accounts, 'HomeCountry').every((value) => regions.has(value))).toBe(true);
        expect(result.semanticRoles?.['Accounts.HomeCountry']).toBeUndefined();
        expect(() => validateGeneratedResult(serviceRequest, result, options)).not.toThrow();
    });
    it('withdraws a country role from the text companion of a status code', async () => {
        // Given a country-labelled code whose declared text companion was classified as a country
        const content = v4(
            `
      <EntityType Name="Permit">
        <Key><PropertyRef Name="PermitID"/></Key>
        <Property Name="PermitID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="ReviewStatus" Type="Edm.String" MaxLength="2"/>
        <Property Name="ReviewStatusText" Type="Edm.String" MaxLength="60"/>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="Permits" EntityType="Club.Permit"/>
      </EntityContainer>`,
            `
      <Annotations Target="Club.Permit/ReviewStatus">
        <Annotation Term="com.sap.vocabularies.Common.v1.Text" Path="ReviewStatusText"/>
        <Annotation Term="com.sap.vocabularies.Common.v1.Label" String="Country Status"/>
      </Annotations>
      <Annotations Target="Club.Permit/ReviewStatusText">
        <Annotation Term="com.sap.vocabularies.Common.v1.Label" String="Country Status"/>
      </Annotations>`
        );
        const serviceRequest = request(content, ['Permits']);
        const options: MockDataGeneratorOptions = { pipeline: 'semantic-v2', seed: 3, rowsPerEntity: 4 };

        // When the service is generated with the country classification on the text
        const result = await generateService(
            serviceRequest,
            options,
            classifierRuntime({ ReviewStatusText: 'country' })
        );

        // Then the text holds descriptions and the country role is claimed only for the code
        expect(result.semanticRoles?.['Permits.ReviewStatus']).toBe('country');
        expect(result.semanticRoles?.['Permits.ReviewStatusText']).toBeUndefined();
        expect(result.diagnostics).toContainEqual(
            expect.objectContaining({ code: 'SEMANTIC_DOMAIN_UNAVAILABLE', target: 'Permits.ReviewStatusText' })
        );
        expect(() => validateGeneratedResult(serviceRequest, result, options)).not.toThrow();
    });
});
