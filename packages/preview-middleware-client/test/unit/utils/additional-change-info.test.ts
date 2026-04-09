import FlexChange from 'mock/sap/ui/fl/Change';
import type { FlexChange as Change } from '../../../src/flp/common';
import type { AddXMLAdditionalInfo } from '../../../src/cpe/additional-change-info/add-xml-additional-info';

const getAddXMLAdditionalInfoMock = jest.fn();
jest.unstable_mockModule('open/ux/preview/client/cpe/additional-change-info/add-xml-additional-info', () => ({
    getAddXMLAdditionalInfo: getAddXMLAdditionalInfoMock
}));

const {
    setAdditionalChangeInfo,
    getAdditionalChangeInfo,
    clearAdditionalChangeInfo,
    setAdditionalChangeInfoForChangeFile
} = await import('open/ux/preview/client/utils/additional-change-info');

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

            setAdditionalChangeInfo(mockChange);

            expect(getAddXMLAdditionalInfoMock).toHaveBeenCalledWith(mockChange, undefined);
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

            expect(getAddXMLAdditionalInfoMock).not.toHaveBeenCalled();
            const result = getAdditionalChangeInfo(mockChange as unknown as Change);
            expect(result).toBeUndefined();
        });

        it('should not set additional change info if change is undefined', () => {
            setAdditionalChangeInfo(undefined);

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

            setAdditionalChangeInfo(mockChange);
            setAdditionalChangeInfo(mockChange);

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
