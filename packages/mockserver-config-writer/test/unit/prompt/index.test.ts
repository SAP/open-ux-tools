import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { getMockserverConfigQuestions } from '../../../src';

describe('Test function getMockserverConfigQuestions()', () => {
    test('Question without proposals', () => {
        expect(getMockserverConfigQuestions()).toEqual([
            { name: 'path', type: 'text', message: 'Path to mocked service', initial: '' }
        ]);
    });

    test('Question with proposals, no mem-fs passed', () => {
        const webappPath = join(__dirname, '../../fixtures/no-ui5-mock-config/webapp');
        expect(getMockserverConfigQuestions({ webappPath })).toEqual([
            {
                name: 'path',
                type: 'text',
                message: 'Path to mocked service',
                initial: '/path/to/odata/service/'
            }
        ]);
    });

    test('Question with proposals, mem-fs passed', () => {
        const fs = create(createStorage());
        fs.writeJSON(join('/webapp/manifest.json'), {
            'sap.app': {
                'dataSources': {
                    'mainService': {
                        'uri': '/service/path/virtual/file/'
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
        expect(getMockserverConfigQuestions({ webappPath, fs })).toEqual([
            {
                name: 'path',
                type: 'text',
                message: 'Path to mocked service',
                initial: '/service/path/virtual/file/'
            }
        ]);
    });

    test('Question with proposals, mem-fs passed, no main service', () => {
        const fs = create(createStorage());
        fs.writeJSON(join('/any/manifest.json'), {});
        const webappPath = join('/any');
        expect(getMockserverConfigQuestions({ webappPath, fs })).toEqual([
            {
                name: 'path',
                type: 'text',
                message: 'Path to mocked service',
                initial: ''
            }
        ]);
    });
});
