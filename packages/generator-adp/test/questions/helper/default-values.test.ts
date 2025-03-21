import type { Dirent } from 'fs';
import { readdirSync } from 'fs';

import { FlexLayer } from '@sap-ux/adp-tooling';

import {
    generateValidNamespace,
    getProjectNames,
    getDefaultProjectName
} from '../../../src/app/questions/helper/default-values';

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    readdirSync: jest.fn()
}));

const readdirSyncMock = readdirSync as jest.Mock;

function fakeDirent(name: string, isFile: boolean): Partial<Dirent> {
    return {
        name,
        isFile: () => isFile
    };
}

describe('generateValidNamespace', () => {
    const projectName = 'app.variant1';
    it('should prepend "customer." when layer is CUSTOMER_BASE', () => {
        const namespace = generateValidNamespace(projectName, FlexLayer.CUSTOMER_BASE);
        expect(namespace).toBe(`customer.${projectName}`);
    });

    it('should return projectName unchanged when layer is not CUSTOMER_BASE', () => {
        const namespace = generateValidNamespace(projectName, FlexLayer.VENDOR);
        expect(namespace).toBe(projectName);
    });
});

describe('getProjectNames', () => {
    const testPath = 'home/projects';

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should return project names that match the regex and sort them in reverse order', () => {
        const fakeDirents = [
            fakeDirent('app.variant1', false),
            fakeDirent('app.variant10', false),
            fakeDirent('app.variant2', false),
            fakeDirent('otherFolder', false),
            fakeDirent('app.variant3', false),
            fakeDirent('somefile.txt', true)
        ] as Dirent[];

        readdirSyncMock.mockReturnValue(fakeDirents);

        const result = getProjectNames(testPath);

        expect(result).toEqual(['app.variant10', 'app.variant3', 'app.variant2', 'app.variant1']);
    });

    it('should return an empty array if no directory names match the regex', () => {
        const fakeDirents = [fakeDirent('folder1', false), fakeDirent('file.txt', true)] as Dirent[];
        readdirSyncMock.mockReturnValue(fakeDirents);

        const result = getProjectNames(testPath);

        expect(result).toEqual([]);
    });
});

describe('getDefaultProjectName', () => {
    const testPath = 'home/projects';

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should return "app.variant1" if no matching project directories exist', () => {
        const fakeDirents: Dirent[] = [
            { name: 'folder', isFile: () => false } as Dirent,
            { name: 'file.txt', isFile: () => true } as Dirent
        ];
        readdirSyncMock.mockReturnValue(fakeDirents);

        const defaultName = getDefaultProjectName(testPath);

        expect(defaultName).toBe('app.variant1');
    });

    it('should increment the highest existing project index', () => {
        const fakeDirents: Dirent[] = [
            fakeDirent('app.variant2', false),
            fakeDirent('app.variant5', false),
            fakeDirent('app.variant3', false)
        ] as Dirent[];
        readdirSyncMock.mockReturnValue(fakeDirents);

        const defaultName = getDefaultProjectName(testPath);

        expect(defaultName).toBe('app.variant6');
    });
});
