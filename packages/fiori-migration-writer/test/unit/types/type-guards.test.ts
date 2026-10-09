import { isProjectFolderArray } from '../../../src/types/project-folder.js';

describe('Type Guards', () => {
    describe('isProjectFolderArray', () => {
        test('should return true for valid ProjectFolder array', () => {
            const valid = [
                {
                    uri: {
                        fsPath: '/path/to/project',
                        scheme: 'file'
                    },
                    name: 'project',
                    index: 0
                }
            ];
            expect(isProjectFolderArray(valid)).toBe(true);
        });

        test('should return true for multiple valid ProjectFolders', () => {
            const valid = [
                {
                    uri: {
                        fsPath: '/path/to/project1',
                        scheme: 'file'
                    },
                    name: 'project1',
                    index: 0
                },
                {
                    uri: {
                        fsPath: '/path/to/project2',
                        scheme: 'file'
                    },
                    name: 'project2',
                    index: 1
                }
            ];
            expect(isProjectFolderArray(valid)).toBe(true);
        });

        test('should return false for empty array', () => {
            expect(isProjectFolderArray([])).toBe(false);
        });

        test('should return false for non-array', () => {
            expect(isProjectFolderArray(null)).toBe(false);
            expect(isProjectFolderArray(undefined)).toBe(false);
            expect(isProjectFolderArray('string')).toBe(false);
            expect(isProjectFolderArray(123)).toBe(false);
            expect(isProjectFolderArray({})).toBe(false);
        });

        test('should return false for array with non-object elements', () => {
            expect(isProjectFolderArray(['string'])).toBe(false);
            expect(isProjectFolderArray([null])).toBe(false);
            expect(isProjectFolderArray([123])).toBe(false);
        });

        test('should return false for array missing uri property', () => {
            const invalid = [
                {
                    name: 'project',
                    index: 0
                }
            ];
            expect(isProjectFolderArray(invalid)).toBe(false);
        });

        test('should return false for array with non-object uri', () => {
            const invalid = [
                {
                    uri: 'not-an-object',
                    name: 'project',
                    index: 0
                }
            ];
            expect(isProjectFolderArray(invalid)).toBe(false);
        });

        test('should return false for array missing uri.fsPath', () => {
            const invalid = [
                {
                    uri: {
                        scheme: 'file'
                    },
                    name: 'project',
                    index: 0
                }
            ];
            expect(isProjectFolderArray(invalid)).toBe(false);
        });

        test('should reject uri without scheme property', () => {
            const invalid = [
                {
                    uri: {
                        fsPath: '/path/to/project'
                        // Missing scheme property
                    },
                    name: 'project',
                    index: 0
                }
            ];
            // Should fail because scheme is required
            expect(isProjectFolderArray(invalid)).toBe(false);
        });
    });
});
