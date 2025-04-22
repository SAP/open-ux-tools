import {
    setAdditionalChangeInfo,
    getAdditionalChangeInfo,
} from '../../../src/utils/additional-change-info';
import FlexChange from 'sap/ui/fl/Change';
import * as xmlAdditionalInfo from '../../../src/cpe/additional-change-info/add-xml-additional-info';
import { FlexChange as Change } from '../../../src/flp/common';

describe('additional-change-info.ts', () => {
    const mockChange = {
        getChangeType: jest.fn(),
        getDefinition: jest.fn(),
        fileName: 'mockFileName'
    } as unknown as FlexChange<xmlAdditionalInfo.AddXMLChangeContent> & { fileName: string };

    const mockAdditionalInfo = {
        someKey: 'someValue'
    } as unknown as xmlAdditionalInfo.AddXMLAdditionalInfo;

    beforeEach(() => {
        mockChange.fileName = 'mockFileName';
        jest.clearAllMocks();
    });

    describe('setAdditionalChangeInfo', () => {
        const getAddXMLAdditionalInfoSpy = jest.spyOn(xmlAdditionalInfo, 'getAddXMLAdditionalInfo').mockReturnValue(undefined);
        it('should set additional change info for addXML change type', () => {
            (mockChange.getChangeType as jest.Mock).mockReturnValueOnce('addXML');
            (mockChange.getDefinition as jest.Mock).mockReturnValueOnce({ fileName: 'mockFileName' });
            const getAddXMLAdditionalInfoSpy = jest.spyOn(xmlAdditionalInfo, 'getAddXMLAdditionalInfo').mockReturnValueOnce(mockAdditionalInfo);

            setAdditionalChangeInfo(mockChange);

            expect(getAddXMLAdditionalInfoSpy).toHaveBeenCalledWith(mockChange);
            const result = getAdditionalChangeInfo(mockChange as unknown as Change);
            expect(result).toEqual(mockAdditionalInfo);
        });

        it('should not set additional change info for unsupported change type', () => {
            mockChange.fileName = 'mockFileName1';
            (mockChange.getChangeType as jest.Mock).mockReturnValueOnce('unsupportedType');
            (mockChange.getDefinition as jest.Mock).mockReturnValueOnce({ fileName: 'mockFileName' });

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

    describe('getAdditionalChangeInfo', () => {
        it('should return additional change info if it exists in the map', () => {
            mockChange.fileName = 'mockFileName';
            jest.spyOn(xmlAdditionalInfo, 'getAddXMLAdditionalInfo').mockReturnValueOnce(mockAdditionalInfo);

            setAdditionalChangeInfo(mockChange);

            const result = getAdditionalChangeInfo(mockChange as unknown as Change);
            expect(result).toEqual(mockAdditionalInfo);
        });

        it('should return undefined if additional change info does not exist in the map', () => {
            mockChange.fileName = 'nonExistentFileName';

            const result = getAdditionalChangeInfo(mockChange as unknown as Change);
            expect(result).toBeUndefined();
        });
    });
});