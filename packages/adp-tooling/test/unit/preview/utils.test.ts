import { DirName } from '@sap-ux/project-access';
import { getFragmentPathFromTemplate } from '../../../src/preview/utils';
import { sep } from 'path';

describe('getFragmentPathFromTemplate', () => {
    const mockChange = {
        projectId: 'adp.v2'
    } as any; // Only projectId is used

    it('should handle template with only one segment', () => {
        const template = 'Hello';
        const path = getFragmentPathFromTemplate(template, mockChange);
        expect(path).toBe(undefined);
    });

    it('should handle template with two segments', () => {
        const template = 'Hello.World';
        const path = getFragmentPathFromTemplate(template, mockChange);
        expect(path).toBe(undefined);
    });

    it('should handle template with more than two segments', () => {
        const template = 'adp.v2.changes.fragments.Hello';
        const path = getFragmentPathFromTemplate(template, mockChange);
        expect(path).toBe(['changes', 'fragments', 'Hello'].join(sep));
    });

    it('should handle template with projectId.changes.fragments and namespace', () => {
        const template = 'myspace.changes.fragments.Hello';
        const path = getFragmentPathFromTemplate(template, { projectId: 'myspace' } as any);
        expect(path).toBe([DirName.Changes, DirName.Fragments, 'Hello'].join(sep));
    });
});
