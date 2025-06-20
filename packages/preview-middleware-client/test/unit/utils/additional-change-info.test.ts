import {
    setAdditionalChangeInfo,
    getAdditionalChangeInfo,
    clearAdditionalChangeInfo,
    setAdditionalChangeInfoForChangeFile
} from '../../../src/utils/additional-change-info';
import FlexChange from 'mock/sap/ui/fl/Change';
import * as xmlAdditionalInfo from '../../../src/cpe/additional-change-info/add-xml-additional-info';
import type { FlexChange as Change } from '../../../src/flp/common';

describe('additional-change-info.ts', () => {
    const mockAdditionalInfo = {
        someKey: 'someValue'
    } as unknown as xmlAdditionalInfo.AddXMLAdditionalInfo;

    afterEach(() => {
        jest.clearAllMocks();
        clearAdditionalChangeInfo();
    });

    describe('setAdditionalChangeInfo', () => {
        const getAddXMLAdditionalInfoSpy = jest
            .spyOn(xmlAdditionalInfo, 'getAddXMLAdditionalInfo')
            .mockReturnValue(undefined);
        it('should set additional change info for addXML change type', () => {
            const mockChange = new FlexChange({
                selector: { id: 'mockSelectorId', idIsLocal: false },
                changeType: 'addXML',
                layer: 'CUSTOMER_BASE',
                fileName: 'mockFileName'
            });
            const getAddXMLAdditionalInfoSpy = jest
                .spyOn(xmlAdditionalInfo, 'getAddXMLAdditionalInfo')
                .mockReturnValueOnce(mockAdditionalInfo);

            setAdditionalChangeInfo(mockChange);

            expect(getAddXMLAdditionalInfoSpy).toHaveBeenCalledWith(mockChange);
            const result = getAdditionalChangeInfo(mockChange as unknown as Change);
            expect(result).toEqual(mockAdditionalInfo);
        });

        it('should not set additional change info for unsupported change type', () => {
            const mockChange = new FlexChange({
                selector: { id: 'mockSelectorId', idIsLocal: false },
                changeType: 'unsupportedType',
                layer: 'CUSTOMER_BASE',
                fileName: 'mockFileName'
            });

            setAdditionalChangeInfo(mockChange);

            expect(getAddXMLAdditionalInfoSpy).not.toHaveBeenCalled();
            const result = getAdditionalChangeInfo(mockChange as unknown as Change);
            expect(result).toBeUndefined();
        });

        it('should not set additional change info if change is undefined', () => {
            setAdditionalChangeInfo(undefined);

            expect(getAddXMLAdditionalInfoSpy).not.toHaveBeenCalled();
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
            jest.spyOn(xmlAdditionalInfo, 'getAddXMLAdditionalInfo').mockReturnValueOnce(mockAdditionalInfo);

            setAdditionalChangeInfo(mockChange);

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
});
