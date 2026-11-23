import FlexChange from 'mock/sap/ui/fl/Change';
import type FlexCommand from 'sap/ui/rta/command/FlexCommand';
const { getFlexChangeList, getFlexXMLChangeList, getChangeDefinition } =
    await import('open/ux/preview/client/utils/changes');

describe('changes.ts', () => {
    describe('getFlexChangeList', () => {
        it('should return an empty array if command is undefined', () => {
            const result = getFlexChangeList(undefined);
            expect(result).toEqual([]);
        });

        it('should return an empty array if getPreparedChange returns undefined', () => {
            const command = {
                getPreparedChange: jest.fn().mockReturnValue(undefined)
            } as unknown as FlexCommand;

            const result = getFlexChangeList(command);
            expect(result).toEqual([]);
        });

        it('should return a single change wrapped in an array', () => {
            const mockChange = new FlexChange({
                selector: { id: 'mockSelectorId', idIsLocal: false },
                changeType: 'addXML',
                layer: 'CUSTOMER_BASE',
                fileName: 'mockFileName'
            });
            const command = {
                getPreparedChange: jest.fn().mockReturnValue(mockChange)
            } as unknown as FlexCommand;

            const result = getFlexChangeList(command);
            expect(result).toEqual([mockChange]);
        });

        it('should return the array of changes as-is', () => {
            const mockChange1 = new FlexChange({
                selector: { id: 'id1', idIsLocal: false },
                changeType: 'addXML',
                layer: 'CUSTOMER_BASE',
                fileName: 'file1'
            });
            const mockChange2 = new FlexChange({
                selector: { id: 'id2', idIsLocal: false },
                changeType: 'rename',
                layer: 'CUSTOMER_BASE',
                fileName: 'file2'
            });
            const command = {
                getPreparedChange: jest.fn().mockReturnValue([mockChange1, mockChange2])
            } as unknown as FlexCommand;

            const result = getFlexChangeList(command);
            expect(result).toEqual([mockChange1, mockChange2]);
        });
    });

    describe('getFlexXMLChangeList', () => {
        it('should return an empty array if command is undefined', () => {
            const result = getFlexXMLChangeList(undefined);
            expect(result).toEqual([]);
        });

        it('should return only changes with addXML change type', () => {
            const xmlChange = new FlexChange({
                selector: { id: 'id1', idIsLocal: false },
                changeType: 'addXML',
                layer: 'CUSTOMER_BASE',
                fileName: 'xmlFile'
            });
            const otherChange = new FlexChange({
                selector: { id: 'id2', idIsLocal: false },
                changeType: 'rename',
                layer: 'CUSTOMER_BASE',
                fileName: 'otherFile'
            });
            const command = {
                getPreparedChange: jest.fn().mockReturnValue([xmlChange, otherChange])
            } as unknown as FlexCommand;

            const result = getFlexXMLChangeList(command);
            expect(result).toHaveLength(1);
            expect(result[0]).toBe(xmlChange);
        });

        it('should return an empty array if no changes have addXML type', () => {
            const otherChange = new FlexChange({
                selector: { id: 'id1', idIsLocal: false },
                changeType: 'rename',
                layer: 'CUSTOMER_BASE',
                fileName: 'otherFile'
            });
            const command = {
                getPreparedChange: jest.fn().mockReturnValue([otherChange])
            } as unknown as FlexCommand;

            const result = getFlexXMLChangeList(command);
            expect(result).toEqual([]);
        });
    });

    describe('getChangeDefinition', () => {
        it('should return change definition using convertToFileContent for modern UI5 changes', () => {
            const mockDefinition = { fileName: 'testFile', changeType: 'addXML' };
            const change = {
                convertToFileContent: jest.fn().mockReturnValue(mockDefinition)
            };

            const result = getChangeDefinition(change as any);
            expect(result).toEqual(mockDefinition);
            expect(change.convertToFileContent).toHaveBeenCalled();
        });

        it('should fall back to getDefinition for legacy UI5 changes (e.g. 1.96.x)', () => {
            const mockDefinition = { fileName: 'legacyFile', changeType: 'rename' };
            const legacyChange = {
                getDefinition: jest.fn().mockReturnValue(mockDefinition)
            };

            const result = getChangeDefinition(legacyChange as any);
            expect(result).toEqual(mockDefinition);
            expect(legacyChange.getDefinition).toHaveBeenCalled();
        });

        it('should throw an error if the change object supports neither API', () => {
            const unsupportedChange = {};

            expect(() => getChangeDefinition(unsupportedChange as any)).toThrow('Unsupported change object');
        });
    });
});
