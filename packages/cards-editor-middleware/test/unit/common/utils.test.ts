import {
    prepareFileName,
    prepareCardForSaving,
    prepareCardTypesForSaving,
    getDirectoriesRecursive,
    getAllManifests,
    traverseI18nProperties,
    i18nEntry
} from "../../../src/common/utils";
import { readFileSync, readdirSync, statSync } from "fs";


jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    readFileSync: jest.fn(),
    readdirSync: jest.fn(),
    statSync: jest.fn()
}));


describe("Common utils", () => {
    const readFileSyncMock = readFileSync as jest.Mock;
    const mockReaddirSync = readdirSync as jest.Mock;
    const mockStatSync = statSync as jest.Mock;
    beforeEach(() => {
        jest.resetAllMocks();
    });

    test("prepareFileName", () => {
        expect(prepareFileName("path/to/file.json")).toBe("file.json");
        expect(prepareFileName("path/to/file")).toBe("file.json");
    });

    test("prepareCardForSaving, when insight version is not declared", () => {
        readFileSyncMock.mockReturnValueOnce(JSON.stringify({ version: "0.1.1" }));
        const card = {
            "sap.insights": {}
        };
        expect(prepareCardForSaving(card)).toBe(JSON.stringify({ "sap.insights": { "versions": { "dtMiddleware": "0.1.1" } } }, null, 2));
    });

    test("prepareCardForSaving, when insight version is declared", () => {
        readFileSyncMock.mockReturnValueOnce(JSON.stringify({ version: "0.1.1" }));
        const card = {
            "sap.insights": {
                "versions": {}
            }
        };
        expect(prepareCardForSaving(card)).toBe(JSON.stringify({ "sap.insights": { "versions": { "dtMiddleware": "0.1.1" } } }, null, 2));
    });

    test("prepareCardTypesForSaving", () => {
        const aMultipleCards = [
            {
                type: "integration",
                manifest: {
                    "_version": "1.15.0",
                    "sap.card": {
                        "type": "Object",
                        "header": {
                            "type": "Numeric",
                            "title": "Card title"
                        }
                    }
                }
            },
            {
                type: "adaptive",
                manifest: {
                    "type": "AdaptiveCard",
                    "body": [
                        {
                            "type": "TextBlock",
                            "wrap": true,
                            "weight": "Bolder",
                            "text": "Card Title",
                        }
                    ]
                }
            }
        ];
        expect(prepareCardTypesForSaving(aMultipleCards)).toEqual({
            integration: JSON.stringify(aMultipleCards[0].manifest, null, 2),
            adaptive: JSON.stringify(aMultipleCards[1].manifest, null, 2)
        });
    });

    test("getDirectoriesRecursive", () => {
        mockReaddirSync.mockReturnValueOnce(["folder1", "file1.txt"]);
        mockStatSync.mockReturnValueOnce({ isDirectory: () => true });
        mockStatSync.mockReturnValueOnce({ isDirectory: () => false });

        mockReaddirSync.mockReturnValueOnce(["file2.txt"]);
        mockStatSync.mockReturnValueOnce({ isDirectory: () => false });

        expect(getDirectoriesRecursive("path/to/folder")).toEqual(["path/to/folder", "path/to/folder/folder1"]);
    });

    test("getAllManifests", () => {
        mockReaddirSync.mockReturnValueOnce(["file1.json", "file2.json"]);
        mockStatSync.mockReturnValueOnce({ isFile: () => true });
        mockStatSync.mockReturnValueOnce({ isFile: () => true });

        readFileSyncMock.mockReturnValueOnce(JSON.stringify({ version: "0.1.1" }));
        readFileSyncMock.mockReturnValueOnce(JSON.stringify({ version: "0.1.1" }));

        expect(getAllManifests("path/to/folder")).toEqual([
            { file: "path/to/folder/file1", manifest: { version: "0.1.1" } },
            { file: "path/to/folder/file2", manifest: { version: "0.1.1" } }
        ]);
    });

    test("traverseI18nProperties", () => {
        const i18nContent = 'appTitle=Sales Order';
        readFileSyncMock.mockReturnValueOnce(i18nContent);
        const  entries:i18nEntry[] = [{ "comment": "XFLD: GroupPropertyLabel for new Entry - Created by Card Generator", "key": "CardGeneratorGroupPropertyLabel_Groups_0_Items_0", "value": "new Entry" }];
        const { updatedEntries, output } = traverseI18nProperties("path/to/i18n", entries);
        expect(updatedEntries).toEqual({});
        expect(output).toEqual([i18nContent]);        
    });

    test("traverseI18nProperties, When new entry matches i18n file content", () => {
        const i18nContent = 'appTitle=Sales Order';
        readFileSyncMock.mockReturnValueOnce(i18nContent);
        const entries:i18nEntry[]  = [{"key": "appTitle", "value": "Sales Order" }];
        const { updatedEntries, output } = traverseI18nProperties("path/to/i18n", entries);
        expect(updatedEntries).toEqual({0: true});
        expect(output).toEqual([i18nContent]);  
    });
});