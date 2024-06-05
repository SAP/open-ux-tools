import { getJSONFileInfo } from "../../src/file/file-info";

describe('fileInfo', () => {
    describe('getJSONFileInfo', () => {
        it('should return JSON file info for empty JSON', async () => {
            const content = JSON.stringify({});
            const jsonFileInfo = await getJSONFileInfo(content);
            expect(jsonFileInfo).toStrictEqual({});
        });

        it('should return JSON file info for JSON with 2 spaces', async () => {
            const content = JSON.stringify({ name: 'Dummy' }, null, 2);
            const jsonFileInfo = await getJSONFileInfo(content);
            expect(jsonFileInfo).toStrictEqual({ size: 2, useTabSymbol: false });
        });

        it('should return JSON file info for JSON with 4 spaces', async () => {
            const content = JSON.stringify({ name: 'Dummy' }, null, 4);
            const jsonFileInfo = await getJSONFileInfo(content);
            expect(jsonFileInfo).toStrictEqual({ size: 4, useTabSymbol: false });
        });
    });
});
