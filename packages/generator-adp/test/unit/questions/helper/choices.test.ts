import type { SourceApplication } from '@sap-ux/adp-tooling';

import { getApplicationChoices } from '../../../../src/app/questions/helper/choices';

describe('choices', () => {
    describe('getApplicationChoices', () => {
        it('should transform an application with a title', () => {
            const apps: SourceApplication[] = [
                {
                    id: '1',
                    title: 'Test App',
                    ach: 'AchValue',
                    registrationIds: ['ID1', 'ID2'],
                    bspName: '',
                    bspUrl: '',
                    fileType: ''
                }
            ];
            const choices = getApplicationChoices(apps);
            expect(choices).toEqual([
                {
                    value: apps[0],
                    name: 'Test App (1, ID1,ID2, AchValue)'
                }
            ]);
        });

        it('should transform an application without a title', () => {
            const apps: SourceApplication[] = [
                {
                    id: '2',
                    title: '',
                    ach: 'Ach1',
                    registrationIds: ['Reg1'],
                    bspName: '',
                    bspUrl: '',
                    fileType: ''
                }
            ];
            const choices = getApplicationChoices(apps);
            expect(choices).toEqual([
                {
                    value: apps[0],
                    name: '2 (Reg1, Ach1)'
                }
            ]);
        });

        it('should clean up extra punctuation when registrationIds and ach are empty', () => {
            const apps: SourceApplication[] = [
                {
                    id: '3',
                    title: 'Empty Fields',
                    ach: '',
                    registrationIds: [],
                    bspName: '',
                    bspUrl: '',
                    fileType: ''
                }
            ];
            const choices = getApplicationChoices(apps);
            expect(choices).toEqual([
                {
                    value: apps[0],
                    name: 'Empty Fields (3)'
                }
            ]);
        });

        it('should return the input if it is not an array', () => {
            const notAnArray = { foo: 'bar' };
            expect(getApplicationChoices(notAnArray as any)).toEqual(notAnArray);
        });
    });
});
