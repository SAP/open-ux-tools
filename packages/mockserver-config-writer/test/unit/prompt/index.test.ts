import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Choice } from 'prompts';
import { getMockserverConfigQuestions } from '../../../src';
import { t } from '../../..';

describe('Test function getMockserverConfigQuestions()', () => {
    test('Question without proposals', () => {
        expect(getMockserverConfigQuestions()).toEqual([
            { name: 'path', type: 'text', message: t('questions.pathToMock') }
        ]);
    });

    test('Question with one choice, no mem-fs passed', () => {
        const webappPath = join(__dirname, '../../fixtures/no-ui5-mock-config/webapp');
        expect(getMockserverConfigQuestions({ webappPath })).toEqual([
            {
                name: 'path',
                type: 'select',
                message: t('questions.pathToMock'),
                initial: 0,
                choices: [
                    {
                        'description': '4.0',
                        'title': 'mainService: /path/to/odata/service/',
                        'value': '/path/to/odata/service/'
                    }
                ]
            }
        ]);
    });

    test('Question for overwrite, no mem-fs passed', () => {
        expect(getMockserverConfigQuestions({ askForOverwrite: true })).toEqual([
            {
                name: 'path',
                type: 'text',
                message: t('questions.pathToMock')
            },
            {
                name: 'overwrite',
                type: 'confirm',
                message: t('questions.overwrite')
            }
        ]);
    });

    test('Question for overwrite, mem-fs passed', () => {
        const fs = create(createStorage());
        expect(getMockserverConfigQuestions({ fs, askForOverwrite: true })).toEqual([
            {
                name: 'path',
                type: 'text',
                message: t('questions.pathToMock')
            },
            {
                name: 'overwrite',
                type: 'confirm',
                message: t('questions.overwrite')
            }
        ]);
    });

    test('Question with one choice, mem-fs passed, no odata version', () => {
        const fs = create(createStorage());
        fs.writeJSON(join('/webapp/manifest.json'), {
            'sap.app': {
                'dataSources': {
                    'ms': {
                        'uri': '/ms/service/path/',
                        'type': 'OData'
                    }
                }
            },
            'sap.ui5': {
                'models': {
                    '': {
                        'dataSource': 'ms'
                    }
                }
            }
        });
        const webappPath = join('/webapp');

        expect(getMockserverConfigQuestions({ fs, webappPath })).toEqual([
            {
                name: 'path',
                type: 'select',
                message: t('questions.pathToMock'),
                initial: 0,
                choices: [
                    {
                        'title': 'ms: /ms/service/path/',
                        'value': '/ms/service/path/'
                    }
                ]
            }
        ]);
    });

    test('Question with two choices, mem-fs passed', () => {
        // Mock setup
        const fs = create(createStorage());
        fs.writeJSON(join('/webapp/manifest.json'), {
            'sap.app': {
                'dataSources': {
                    'vFourService': {
                        'uri': '/path/v4/service/',
                        'type': 'OData',
                        'settings': {
                            'odataVersion': '4.0'
                        }
                    },
                    'mainService': {
                        'uri': '/service/path/virtual/file/',
                        'type': 'OData',
                        'settings': {
                            'odataVersion': '2.0'
                        }
                    },
                    'nonOdataService': {
                        'uri': '/non/odata/service/',
                        'type': 'NonOdata'
                    }
                }
            },
            'sap.ui5': {
                'models': {
                    '': {
                        'dataSource': 'mainService'
                    }
                }
            }
        });
        const webappPath = join('/webapp');

        // Test execution
        const [question] = getMockserverConfigQuestions({ fs, webappPath });

        // Result check
        expect(question.name).toEqual('path');
        expect(question.type).toEqual('select');
        expect(question.message).toEqual(t('questions.pathToMock'));
        expect(question.choices).toBeDefined();
        expect(question.choices?.length).toBe(2);
        expect((question.choices as any[]).find((c) => c.value === '/path/v4/service/')).toEqual({
            'description': '4.0',
            'title': 'vFourService: /path/v4/service/',
            'value': '/path/v4/service/'
        });
        const mainServiceIndex = (question.choices as Choice[]).findIndex(
            (q: Choice) => q.value === '/service/path/virtual/file/'
        );
        expect(question.initial).toBe(mainServiceIndex);
        expect((question.choices as Choice[])[mainServiceIndex]).toEqual({
            'description': '2.0',
            'title': 'mainService: /service/path/virtual/file/',
            'value': '/service/path/virtual/file/'
        });
    });

    test('Question with proposals, mem-fs passed, no main service', () => {
        const fs = create(createStorage());
        fs.writeJSON(join('/any/manifest.json'), {});
        const webappPath = join('/any');
        expect(getMockserverConfigQuestions({ fs, webappPath })).toEqual([
            {
                name: 'path',
                type: 'text',
                message: t('questions.pathToMock')
            }
        ]);
    });
});
