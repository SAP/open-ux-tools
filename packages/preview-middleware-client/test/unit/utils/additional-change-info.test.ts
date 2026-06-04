import { jest } from '@jest/globals';
import FlexChange from 'mock/sap/ui/fl/Change';
import type { FlexChange as Change } from '../../../src/flp/common.js';
import type { AddXMLAdditionalInfo } from '../../../src/cpe/additional-change-info/add-xml-additional-info.js';

const getAddXMLAdditionalInfoMock = jest.fn();
jest.unstable_mockModule('open/ux/preview/client/cpe/additional-change-info/add-xml-additional-info', () => ({
    getAddXMLAdditionalInfo: getAddXMLAdditionalInfoMock
}));

const {
    setAdditionalChangeInfo,
    getAdditionalChangeInfo,
    clearAdditionalChangeInfo,
    setAdditionalChangeInfoForChangeFile,
    getFlexChangeList,
    getFlexXMLChangeList,
    getChangeDefinition
} = await import('open/ux/preview/client/utils/additional-change-info');
import type FlexCommand from 'sap/ui/rta/command/FlexCommand';

describe('additional-change-info.ts', () => {
    const mockAdditionalInfo = {
        someKey: 'someValue'
    } as unknown as AddXMLAdditionalInfo;

    afterEach(() => {
        jest.clearAllMocks();
        clearAdditionalChangeInfo();
    });

    describe('setAdditionalChangeInfo', () => {
        it('should set additional change info for addXML change type', () => {
            const mockChange = new FlexChange({
                selector: { id: 'mockSelectorId', idIsLocal: false },
                changeType: 'addXML',
                layer: 'CUSTOMER_BASE',
                fileName: 'mockFileName'
            });
            getAddXMLAdditionalInfoMock.mockReturnValueOnce(mockAdditionalInfo);

            setAdditionalChangeInfo([mockChange]);

            expect(getAddXMLAdditionalInfoMock).toHaveBeenCalledWith(mockChange, undefined);
            const result = getAdditionalChangeInfo(mockChange as unknown as Change);
            expect(result).toEqual(mockAdditionalInfo);
        });

        it('should not set additional change info if change is undefined', () => {
            setAdditionalChangeInfo([]);

            expect(getAddXMLAdditionalInfoMock).not.toHaveBeenCalled();
        });

        it('should not set additional change info if a value is already set', () => {
            const mockChange = new FlexChange({
                selector: { id: 'mockSelectorId', idIsLocal: false },
                changeType: 'addXML',
                layer: 'CUSTOMER_BASE',
                fileName: 'mockFileName'
            });
            getAddXMLAdditionalInfoMock
                .mockReturnValueOnce({ templateName: 'template' })
                .mockReturnValueOnce({ controlType: 'test' });

            setAdditionalChangeInfo([mockChange]);
            setAdditionalChangeInfo([mockChange]);

            expect(getAddXMLAdditionalInfoMock).toHaveBeenCalledTimes(2);

            const result = getAdditionalChangeInfo(mockChange as unknown as Change);
            expect(result).toEqual({ controlType: 'test', templateName: 'template' });
        });
    });

    describe('setAdditionalChangeInfoForChangeFile', () => {
        it('should set additional change info for templateName', () => {
            const mockChange = new FlexChange({
                selector: { id: 'mockSelectorId', idIsLocal: false },
                changeType: 'addXML',
                layer: 'CUSTOMER_BASE',
                fileName: 'mockFileName'
            });

            setAdditionalChangeInfoForChangeFile('mockFileName', { templateName: 'template' });

            const result = getAdditionalChangeInfo(mockChange as unknown as Change);
            expect(result).toEqual({ templateName: 'template' });
        });
    });

    describe('getAdditionalChangeInfo', () => {
        it('should return additional change info if it exists in the map', () => {
            const mockChange = new FlexChange({
                selector: { id: 'mockSelectorId', idIsLocal: false },
                changeType: 'addXML',
                layer: 'CUSTOMER_BASE',
                fileName: 'mockFileName'
            });
            getAddXMLAdditionalInfoMock.mockReturnValueOnce(mockAdditionalInfo);

            setAdditionalChangeInfo([mockChange]);

            const result = getAdditionalChangeInfo(mockChange as unknown as Change);
            expect(result).toEqual(mockAdditionalInfo);
        });

        it('should return undefined if additional change info does not exist in the map', () => {
            const mockChange = new FlexChange({
                selector: { id: 'mockSelectorId', idIsLocal: false },
                changeType: 'addXML',
                layer: 'CUSTOMER_BASE',
                fileName: 'nonExistentFileName'
            });

            const result = getAdditionalChangeInfo(mockChange as unknown as Change);
            expect(result).toBeUndefined();
        });
    });

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
