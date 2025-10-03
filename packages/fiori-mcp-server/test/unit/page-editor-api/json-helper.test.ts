import { updateProperty } from '../../../src/page-editor-api/json-helper';

describe('Test for "JsonLineFinder"', () => {
    describe('Method "updateProperty"', () => {
        const obj = {
            dummy1: {
                dummy11: true
            },
            dummy2: {
                dummy21: [{ dummy31: true }, { dummy31: false }]
            }
        };
        let objClone: any;

        beforeEach(() => {
            objClone = JSON.parse(JSON.stringify(obj));
        });

        test('Update property in Object', () => {
            expect(objClone['dummy1']['dummy11']).toEqual(true);
            updateProperty(objClone, ['dummy1', 'dummy11'], false);
            expect(objClone['dummy1']['dummy11']).toEqual(false);
        });

        test('Update property in Array', () => {
            expect(objClone['dummy2']['dummy21']['1']['dummy31']).toEqual(false);
            updateProperty(objClone, ['dummy2', 'dummy21', '1', 'dummy31'], true);
            expect(objClone['dummy2']['dummy21']['1']['dummy31']).toEqual(true);
        });

        test('Append Array', () => {
            updateProperty(objClone, ['dummy2', 'dummy21'], 'test', true);
            expect(objClone['dummy2']['dummy21']).toEqual([{ dummy31: true }, { dummy31: false }, 'test']);
        });

        test('Replace Array', () => {
            updateProperty(objClone, ['dummy2', 'dummy21'], 'test', false);
            expect(objClone['dummy2']['dummy21']).toEqual('test');
        });

        test('Create Array', () => {
            updateProperty(objClone, ['dummy2'], 'test', true);
            expect(objClone['dummy2']).toEqual(['test']);
        });

        test('Delete property in Object', () => {
            expect(objClone['dummy1']['dummy11']).toEqual(true);
            updateProperty(objClone, ['dummy1', 'dummy11'], undefined);
            expect('dummy11' in objClone['dummy1']).toBeFalsy();
        });

        test('Delete property in Array', () => {
            expect(objClone['dummy2']['dummy21'].length).toEqual(2);
            updateProperty(objClone, ['dummy2', 'dummy21', '1'], undefined);
            expect(objClone['dummy2']['dummy21'].length).toEqual(1);
        });
    });
});
