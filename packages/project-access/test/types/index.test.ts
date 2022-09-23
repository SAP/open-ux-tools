import { FileName } from '@sap-ux/project-types';

describe('Test types', () => {
    test('Test imported const enum from project-types', () => {
        expect(FileName.Manifest).toBe('manifest.json');
    });
});
