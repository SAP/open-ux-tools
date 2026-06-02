import type { Editor } from 'mem-fs-editor';
import type { Logger } from '@sap-ux/logger';
import type { ApplicationAccess } from '@sap-ux/project-access';
import { loadServiceMetadata } from '../../../src/utils/xmlMetadataUtils';

const METADATA_XML = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            <EntityType Name="TestEntity">
                <Key>
                    <PropertyRef Name="ID"/>
                </Key>
                <Property Name="ID" Type="Edm.String"/>
            </EntityType>
            <EntityContainer Name="EntityContainer">
                <EntitySet Name="TestSet" EntityType="TestService.TestEntity"/>
            </EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

const ANNOTATION_XML = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:Reference Uri="https://sap.github.io/odata-vocabularies/vocabularies/UI.xml">
        <edmx:Include Namespace="com.sap.vocabularies.UI.v1" Alias="UI" />
    </edmx:Reference>
    <edmx:DataServices>
        <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="local">
            <Annotations Target="TestService.TestEntity">
                <Annotation Term="UI.Chart" Qualifier="Annotated">
                    <Record Type="UI.ChartDefinitionType">
                        <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Line"/>
                    </Record>
                </Annotation>
            </Annotations>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

function createEditorMock(files: Record<string, string | undefined>): Editor {
    return {
        read: jest.fn((filePath: string) => {
            if (!(filePath in files)) {
                throw new Error(`File not found: ${filePath}`);
            }
            return files[filePath];
        })
    } as unknown as Editor;
}

function createAppAccessMock(metadataLocal?: string, annotationLocals: string[] = []): ApplicationAccess | undefined {
    return {
        project: {
            apps: {
                '': {
                    services: {
                        mainService: {
                            local: metadataLocal,
                            annotations: annotationLocals.map((local) => ({ local }))
                        }
                    }
                }
            }
        }
    } as unknown as ApplicationAccess;
}

describe('loadServiceMetadata()', () => {
    let mockLogger: Logger;

    beforeEach(() => {
        mockLogger = {
            warn: jest.fn(),
            debug: jest.fn(),
            info: jest.fn(),
            error: jest.fn()
        } as unknown as Logger;
    });

    test('returns undefined when no XML can be located', async () => {
        const result = await loadServiceMetadata(undefined, undefined, mockLogger);
        expect(result).toBeUndefined();
    });

    test('returns converted metadata when only metadata XML is present', async () => {
        const fs = createEditorMock({ '/svc/metadata.xml': METADATA_XML });
        const appAccess = createAppAccessMock('/svc/metadata.xml');
        const result = await loadServiceMetadata(appAccess, fs, mockLogger);
        expect(result).toBeDefined();
        expect(result?.entitySets.find((es) => es.name === 'TestSet')).toBeDefined();
    });

    test('merges annotation files with metadata when both are present', async () => {
        const fs = createEditorMock({
            '/svc/metadata.xml': METADATA_XML,
            '/svc/annotations.xml': ANNOTATION_XML
        });
        const appAccess = createAppAccessMock('/svc/metadata.xml', ['/svc/annotations.xml']);
        const result = await loadServiceMetadata(appAccess, fs, mockLogger);
        expect(result).toBeDefined();
        const entityType = result?.entitySets.find((es) => es.name === 'TestSet')?.entityType;
        const annotations = entityType?.annotations.UI as Record<string, unknown> | undefined;
        expect(annotations?.['Chart#Annotated']).toBeDefined();
    });

    test('uses the provided metadata override and skips annotation files', async () => {
        const fs = createEditorMock({});
        const appAccess = createAppAccessMock(undefined, ['/svc/annotations.xml']);
        const result = await loadServiceMetadata(appAccess, fs, mockLogger, METADATA_XML);
        expect(result).toBeDefined();
        // fs.read should not be called because the override is used and annotations are skipped
        expect((fs.read as jest.Mock).mock.calls).toHaveLength(0);
    });

    test('skips unreadable annotation files but keeps metadata', async () => {
        const fs = createEditorMock({ '/svc/metadata.xml': METADATA_XML });
        const appAccess = createAppAccessMock('/svc/metadata.xml', ['/svc/missing.xml']);
        const result = await loadServiceMetadata(appAccess, fs, mockLogger);
        expect(result).toBeDefined();
        expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('/svc/missing.xml'));
    });

    test('returns undefined when service has no readable XML files', async () => {
        const fs = createEditorMock({});
        const appAccess = createAppAccessMock();
        const result = await loadServiceMetadata(appAccess, fs, mockLogger);
        expect(result).toBeUndefined();
    });
});
