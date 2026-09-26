import { generateService } from '../../src/index.js';
import {
    SEMANTIC_ROLE_REGISTRY_FINGERPRINT,
    routedRoleCompatibility,
    stringDateFormat,
    stringTimeFormat
} from '../../src/semantics/role-registry.js';
import type { SemanticClassifier } from '../../src/types.js';

const metadata = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
<EntityType Name="Posting"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="PostingDate" Type="Edm.String" MaxLength="8"/>
<Property Name="DocumentDate" Type="Edm.String" MaxLength="10"/>
<Property Name="ChangedAt" Type="Edm.String" MaxLength="14"/>
<Property Name="CreatedAt" Type="Edm.String"/>
<Property Name="ValidFrom" Type="Edm.String" MaxLength="12"/>
</EntityType>
<EntityContainer Name="Container"><EntitySet Name="Postings" EntityType="Demo.Posting"/></EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;

// Head A accepts a date role for every date-named column.
const classifier: SemanticClassifier = {
    fingerprint: 'string-dates',
    classify: async (input) =>
        /Date|At|From/u.test(input.propertyName)
            ? { role: 'date', confidence: 0.99, source: 'classifier', routeThreshold: 0.5, predictionSetSize: 1 }
            : { role: 'unknown', confidence: 0.99, source: 'classifier' }
};

describe('string-typed dates', () => {
    it('derives the date format from the declared length of a string column', () => {
        expect(stringDateFormat({ primitiveType: 'string', maxLength: 8 })).toBe('yyyymmdd');
        expect(stringDateFormat({ primitiveType: 'string', maxLength: 10 })).toBe('iso-date');
        expect(stringDateFormat({ primitiveType: 'string', maxLength: 14 })).toBe('yyyymmddhhmmss');
        expect(stringDateFormat({ primitiveType: 'string', maxLength: 24 })).toBe('iso-datetime');
        expect(stringDateFormat({ primitiveType: 'string' })).toBe('iso-datetime');
        expect(stringDateFormat({ primitiveType: 'string', maxLength: 12 })).toBeUndefined();
        expect(stringDateFormat({ primitiveType: 'date' })).toBeUndefined();
        // The registry the classifier head pins does not change.
        expect(SEMANTIC_ROLE_REGISTRY_FINGERPRINT).toMatch(/^[0-9a-f]{64}$/u);
    });

    it('fills string columns the classifier accepted as dates with dates of the implied format', async () => {
        const result = await generateService(
            {
                metadata: { format: 'edmx', content: metadata },
                service: { urlPath: '/postings', odataVersion: '4.0' },
                targets: [{ name: 'Postings', kind: 'entity-set' }],
                existingData: {}
            },
            { pipeline: 'semantic-v2', seed: 9, rowsPerEntity: 3 },
            { classifier }
        );

        expect(result.semanticRoles).toMatchObject({
            'Postings.PostingDate': 'date',
            'Postings.DocumentDate': 'date',
            'Postings.ChangedAt': 'date',
            'Postings.CreatedAt': 'date'
        });
        expect(result.semanticRoles?.['Postings.ValidFrom']).toBeUndefined();
        for (const row of result.resources.Postings) {
            expect(row.PostingDate).toMatch(/^20\d{6}$/u);
            expect(row.DocumentDate).toMatch(/^20\d{2}-\d{2}-\d{2}$/u);
            expect(row.ChangedAt).toMatch(/^20\d{12}$/u);
            expect(row.CreatedAt).toMatch(/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/u);
        }
    });
});

describe('routed roles across compatible column types', () => {
    const typed = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
<EntityType Name="Visit"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="VisitDate" Type="Edm.DateTimeOffset"/>
<Property Name="ReportedAt" Type="Edm.Date"/>
<Property Name="StartTime" Type="Edm.String" MaxLength="6"/>
<Property Name="EndTime" Type="Edm.String" MaxLength="8"/>
<Property Name="ShortTime" Type="Edm.String" MaxLength="4"/>
</EntityType>
<EntityContainer Name="Container"><EntitySet Name="Visits" EntityType="Demo.Visit"/></EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;
    const roles: Readonly<Record<string, string>> = {
        VisitDate: 'date',
        ReportedAt: 'datetime',
        StartTime: 'time',
        EndTime: 'time',
        ShortTime: 'time'
    };
    const typedClassifier: SemanticClassifier = {
        fingerprint: 'typed-roles',
        classify: async (input) =>
            roles[input.propertyName]
                ? {
                      role: roles[input.propertyName] ?? 'unknown',
                      confidence: 0.99,
                      source: 'classifier',
                      routeThreshold: 0.5,
                      predictionSetSize: 1
                  }
                : { role: 'unknown', confidence: 0.99, source: 'classifier' }
    };

    it('writes date and datetime roles into either temporal column type and times into string columns', async () => {
        const result = await generateService(
            {
                metadata: { format: 'edmx', content: typed },
                service: { urlPath: '/visits', odataVersion: '4.0' },
                targets: [{ name: 'Visits', kind: 'entity-set' }],
                existingData: {}
            },
            { pipeline: 'semantic-v2', seed: 4, rowsPerEntity: 3 },
            { classifier: typedClassifier }
        );

        expect(result.semanticRoles).toMatchObject({
            'Visits.VisitDate': 'date',
            'Visits.ReportedAt': 'datetime',
            'Visits.StartTime': 'time',
            'Visits.EndTime': 'time'
        });
        // A 4-character column has no time format, so the role is not taken.
        expect(result.semanticRoles?.['Visits.ShortTime']).toBeUndefined();
        for (const row of result.resources.Visits) {
            expect(row.VisitDate).toMatch(/^\d{4}-\d{2}-\d{2}T/u);
            expect(row.ReportedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
            expect(row.StartTime).toMatch(/^([01]\d|2[0-3])[0-5]\d00$/u);
            expect(row.EndTime).toMatch(/^([01]\d|2[0-3]):[0-5]\d:00$/u);
        }
    });

    it('keeps the registry compatibility for keys and unrelated types', () => {
        expect(routedRoleCompatibility('date', { primitiveType: 'datetime', isKey: true })).toBe('incompatible-type');
        expect(routedRoleCompatibility('audit_user', { primitiveType: 'guid', isKey: false })).toBe(
            'incompatible-type'
        );
        expect(routedRoleCompatibility('time', { primitiveType: 'string', isKey: false, maxLength: 4 })).toBe(
            'incompatible-type'
        );
        expect(stringTimeFormat({ primitiveType: 'string' })).toBe('iso-time');
    });
});
