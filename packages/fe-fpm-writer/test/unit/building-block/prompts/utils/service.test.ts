import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import { getProject } from '@sap-ux/project-access';
import type { Project } from '@sap-ux/project-access';
import { FioriAnnotationService } from '@sap-ux/fiori-annotation-api';
import {
    getAnnotationPathQualifiers,
    getAnnotationTermAlias,
    getEntityTypes,
    getMappedServiceName
} from '../../../../../src/building-block/prompts/utils/service';
import { testSchema } from '../../../sample/building-block/webapp-prompts-cap/schema';

const projectFolder = join(__dirname, '../../../sample/building-block/webapp-prompts');
const capProjectFolder = join(__dirname, '../../../sample/building-block/webapp-prompts-cap');
const capAppFolder = join('app/incidents');

const ENTITY_TYPE = 'C_CUSTOMER_OP_SRV.C_CustomerOPType';

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

    test('entityType', async () => {
        const entityTypes = await getEntityTypes(project, '');
        expect(entityTypes.length).toBe(30);
    });

    test('entityType - CAP', async () => {
        jest.spyOn(FioriAnnotationService, 'createService').mockResolvedValueOnce({
            sync: jest.fn(),
            getSchema: () => ({
                identification: '',
                version: '',
                references: [],
                schema: testSchema
            })
        } as unknown as FioriAnnotationService);
        const entityTypes = await getEntityTypes(capProject, capAppFolder);
        expect(entityTypes.length).toBe(11);
    });

    test('getMappedServiceName - CAP', async () => {
        expect(await getMappedServiceName(capProject, 'mainService', capAppFolder)).toBe('mappedMainServiceName');
    });

    test('getMappedServiceName - CAP, appId = undefined', async () => {
        expect(await getMappedServiceName(capProject, 'mainService', undefined!)).toBe('mappedMainServiceName');
    });

    test('getMappedServiceName - CAP, no app for appId found throws error', async () => {
        await expect(getMappedServiceName(capProject, 'mainService', 'invalidAppId')).rejects.toThrow(
            'ERROR_INVALID_APP_ID'
        );
    });

    test('getAnnotationPathQualifiers - existing annotations, absolute binding context path', async () => {
        const annotationPathQualifiers = await getAnnotationPathQualifiers(
            project,
            '',
            ENTITY_TYPE,
            [UIAnnotationTerms.Chart, UIAnnotationTerms.LineItem, UIAnnotationTerms.SelectionFields],
            { type: 'absolute' }
        );
        expect(annotationPathQualifiers).toMatchSnapshot();
    });

    test('getAnnotationPathQualifiers - existing annotations for EntitySet, absolute binding context path', async () => {
        const annotationPathQualifiers = await getAnnotationPathQualifiers(
            project,
            '',
            'C_CustomerBankDetailsOP',
            [UIAnnotationTerms.Chart, UIAnnotationTerms.LineItem, UIAnnotationTerms.SelectionFields],
            { type: 'absolute' }
        );
        expect(annotationPathQualifiers).toMatchSnapshot();
    });

    test('getAnnotationPathQualifiers - existing annotations, absolute binding context path, use namespace', async () => {
        const annotationPathQualifiers = await getAnnotationPathQualifiers(
            project,
            '',
            ENTITY_TYPE,
            [UIAnnotationTerms.Chart, UIAnnotationTerms.LineItem, UIAnnotationTerms.SelectionFields],
            { type: 'absolute' },
            true
        );
        expect(annotationPathQualifiers).toMatchSnapshot();
    });

    test('getAnnotationPathQualifiers - non existing annotations, absolute binding context path', async () => {
        const annotationPathQualifiers = await getAnnotationPathQualifiers(
            project,
            '',
            '',
            [UIAnnotationTerms.SelectionVariant],
            { type: 'absolute' }
        );
        expect(annotationPathQualifiers).toMatchObject({});
    });

    test('getAnnotationPathQualifiers - existing annotations, relative binding context path', async () => {
        const annotationPathQualifiers = await getAnnotationPathQualifiers(
            project,
            '',
            ENTITY_TYPE,
            [UIAnnotationTerms.Chart, UIAnnotationTerms.LineItem, UIAnnotationTerms.SelectionFields],
            { type: 'relative' }
        );
        expect(annotationPathQualifiers).toMatchSnapshot();
    });

    test('getAnnotationPathQualifiers - non existing annotations, relative binding context path', async () => {
        const annotationPathQualifiers = await getAnnotationPathQualifiers(
            project,
            '',
            '',
            [UIAnnotationTerms.SelectionVariant],
            { type: 'relative' }
        );
        expect(annotationPathQualifiers).toMatchObject({});
    });

    test('getAnnotationPathQualifiers - existing annotations, relative binding context path, filter isCollection', async () => {
        const annotationPathQualifiers = await getAnnotationPathQualifiers(
            project,
            '',
            ENTITY_TYPE,
            [UIAnnotationTerms.LineItem],
            { type: 'relative', isCollection: true }
        );
        expect(annotationPathQualifiers).toMatchSnapshot();
    });

    test('getAnnotationTermAlias', async () => {
        const alias = getAnnotationTermAlias(UIAnnotationTerms.LineItem).join('.');
        expect(alias).toBe('UI.LineItem');
    });
});
