import type { Dirent } from 'fs';
import { existsSync, readdirSync } from 'fs';

import { generateValidNamespace, getDefaultProjectName } from '../../../../src/app/questions/helper/default-values';

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    readdirSync: jest.fn(),
    existsSync: jest.fn()
}));

const readdirSyncMock = readdirSync as jest.Mock;
const existsSyncMock = existsSync as jest.Mock;

function fakeDirent(name: string, isFile: boolean): Partial<Dirent> {
    return {
        name,
        isFile: () => isFile
    };
}

describe('generateValidNamespace', () => {
    const projectName = 'app.variant1';
    it('should prepend "customer." when layer is CUSTOMER_BASE', () => {
        const namespace = generateValidNamespace(projectName, true);
        expect(namespace).toBe(`customer.${projectName}`);
    });

    it('should return projectName unchanged when layer is not CUSTOMER_BASE', () => {
        const namespace = generateValidNamespace(projectName, false);
        expect(namespace).toBe(projectName);
    });
});

describe('getDefaultProjectName', () => {
    const testPath = 'home/projects';

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should return "app.variant1" if no matching project directories exist', () => {
        existsSyncMock.mockReturnValueOnce(true).mockReturnValueOnce(false);

        const defaultName = getDefaultProjectName(testPath);

        expect(defaultName).toBe('app.variant2');
    });
});
