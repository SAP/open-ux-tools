import { jest } from '@jest/globals';
import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Project } from '@sap-ux/project-access';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const mockGetCapModelAndServices = jest.fn().mockResolvedValue({
    model: {},
    services: [],
    cdsVersionInfo: { home: '', version: '', root: '' }
});
const mockGetCapServiceName = jest.fn().mockResolvedValue('mappedMainServiceName');

jest.unstable_mockModule('@sap-ux/project-access', () => {
    const actual = jest.requireActual<typeof import('@sap-ux/project-access')>('@sap-ux/project-access');
    return {
        ...actual,
        getCapModelAndServices: mockGetCapModelAndServices,
        getCapServiceName: mockGetCapServiceName
    };
});

const { getProject } = await import('@sap-ux/project-access');
const { FioriAnnotationService } = await import('@sap-ux/fiori-annotation-api');
const {
    getAnnotationPathQualifiers,
    getAnnotationTermAlias,
    getEntitySets,
    getMappedServiceName
} = await import('../../../../../src/building-block/prompts/utils/service');

const projectFolder = join(__dirname, '../../../sample/building-block/webapp-prompts');
const capProjectFolder = join(__dirname, '../../../sample/building-block/webapp-prompts-cap');
const capAppFolder = join('app/incidents');

const ENTITY_SET = 'C_CustomerOP';

describe('utils - service', () => {
    let project: Project;
    let capProject: Project;

    beforeAll(async () => {
        project = await getProject(projectFolder);
        capProject = await getProject(capProjectFolder);
    });

    describe('getEntitySets', () => {
        test('EDMX project', async () => {
            const entityTypes = await getEntitySets(project, '');
            expect(entityTypes.length).toBe(30);
        });

        test('CAP project', async () => {
            jest.spyOn(FioriAnnotationService, 'createService').mockResolvedValueOnce({
                sync: jest.fn(),
                getSchema: () => ({
                    identification: '',
                    version: '',
                    references: [],
                    schema: {
                        entitySets: [
                            {
                                name: 'Incidents',
                                fullyQualifiedName: 'IncidentService.EntityContainer/Incidents'
                            },
                            {
                                name: 'IncidentFlow',
                                fullyQualifiedName: 'IncidentService.EntityContainer/IncidentFlow'
                            },
                            {
                                name: 'IncidentProcessTimeline',
                                fullyQualifiedName: 'IncidentService.EntityContainer/IncidentProcessTimeline'
                            }
                        ]
                    }
                })
            } as unknown as FioriAnnotationService);
            const entitySets = await getEntitySets(capProject, capAppFolder);
            expect(entitySets.length).toEqual(3);
            expect(entitySets.map((entitySet) => entitySet.fullyQualifiedName)).toEqual([
                'IncidentService.EntityContainer/Incidents',
                'IncidentService.EntityContainer/IncidentFlow',
                'IncidentService.EntityContainer/IncidentProcessTimeline'
            ]);
        });
    });

    describe('getMappedServiceName', () => {
        test('CAP', async () => {
            expect(await getMappedServiceName(capProject, 'mainService', capAppFolder)).toBe('mappedMainServiceName');
        });

        test('CAP, appId = undefined', async () => {
            expect(await getMappedServiceName(capProject, 'mainService', undefined!)).toBe('mappedMainServiceName');
        });

        test('CAP, no app for appId found throws error', async () => {
            await expect(getMappedServiceName(capProject, 'mainService', 'invalidAppId')).rejects.toThrow(
                'ERROR_INVALID_APP_ID'
            );
        });
    });

    describe('getAnnotationPathQualifiers', () => {
        test('Existing annotations, absolute binding context path', async () => {
            const annotationPathQualifiers = await getAnnotationPathQualifiers(
                project,
                '',
                ENTITY_SET,
                [UIAnnotationTerms.Chart, UIAnnotationTerms.LineItem, UIAnnotationTerms.SelectionFields],
                { type: 'absolute' }
            );
            expect(annotationPathQualifiers).toMatchSnapshot();
        });

        test('Existing annotations for EntitySet, absolute binding context path', async () => {
            const annotationPathQualifiers = await getAnnotationPathQualifiers(
                project,
                '',
                'C_CustomerBankDetailsOP',
                [UIAnnotationTerms.Chart, UIAnnotationTerms.LineItem, UIAnnotationTerms.SelectionFields],
                { type: 'absolute' }
            );
            expect(annotationPathQualifiers).toMatchSnapshot();
        });

        test('Existing annotations, absolute binding context path, use namespace', async () => {
            const annotationPathQualifiers = await getAnnotationPathQualifiers(
                project,
                '',
                ENTITY_SET,
                [UIAnnotationTerms.Chart, UIAnnotationTerms.LineItem, UIAnnotationTerms.SelectionFields],
                { type: 'absolute' },
                true
            );
            expect(annotationPathQualifiers).toMatchSnapshot();
        });

        test('Non existing annotations, absolute binding context path', async () => {
            const annotationPathQualifiers = await getAnnotationPathQualifiers(
                project,
                '',
                '',
                [UIAnnotationTerms.SelectionVariant],
                { type: 'absolute' }
            );
            expect(annotationPathQualifiers).toMatchObject({});
        });

        test('Existing annotations, relative binding context path', async () => {
            const annotationPathQualifiers = await getAnnotationPathQualifiers(
                project,
                '',
                ENTITY_SET,
                [UIAnnotationTerms.Chart, UIAnnotationTerms.LineItem, UIAnnotationTerms.SelectionFields],
                { type: 'relative' }
            );
            expect(annotationPathQualifiers).toMatchSnapshot();
        });

        test('Non existing annotations, relative binding context path', async () => {
            const annotationPathQualifiers = await getAnnotationPathQualifiers(
                project,
                '',
                '',
                [UIAnnotationTerms.SelectionVariant],
                { type: 'relative' }
            );
            expect(annotationPathQualifiers).toMatchObject({});
        });

        test('Existing annotations, relative binding context path, filter isCollection', async () => {
            const annotationPathQualifiers = await getAnnotationPathQualifiers(
                project,
                '',
                ENTITY_SET,
                [UIAnnotationTerms.LineItem],
                { type: 'relative', isCollection: true }
            );
            expect(annotationPathQualifiers).toMatchSnapshot();
        });
    });

    test('getAnnotationTermAlias', async () => {
        const alias = getAnnotationTermAlias(UIAnnotationTerms.LineItem).join('.');
        expect(alias).toBe('UI.LineItem');
    });
});
