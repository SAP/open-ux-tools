import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import { join } from 'path';
import { getProject } from '@sap-ux/project-access';
import type { Project } from '@sap-ux/project-access';
import { FioriAnnotationService } from '@sap-ux/fiori-annotation-api';
import {
    getAnnotationPathQualifiers,
    getAnnotationTermAlias,
    getEntitySets,
    getMappedServiceName
} from '../../../../../src/building-block/prompts/utils/service';

const projectFolder = join(__dirname, '../../../sample/building-block/webapp-prompts');
const capProjectFolder = join(__dirname, '../../../sample/building-block/webapp-prompts-cap');
const capAppFolder = join('app/incidents');

const ENTITY_SET = 'C_CUSTOMER_OP_SRV.C_CUSTOMER_OP_SRV_Entities/C_CustomerOP';

jest.mock('@sap-ux/project-access', () => ({
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ...(jest.requireActual('@sap-ux/project-access') as object),
    getCapModelAndServices: jest.fn().mockResolvedValue({
        model: {},
        services: [],
        cdsVersionInfo: { home: '', version: '', root: '' }
    }),
    getCapServiceName: jest.fn().mockResolvedValue('mappedMainServiceName')
}));

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
            const entityTypes = await getEntitySets(capProject, capAppFolder);
            expect(entityTypes.length).toEqual(3);
            expect(entityTypes.map((entityType) => entityType.fullyQualifiedName)).toEqual([
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
