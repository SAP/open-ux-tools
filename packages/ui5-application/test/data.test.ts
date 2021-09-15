import { mergeUi5 } from "../src/data/defaults";
import type { UI5 } from "@sap/open-ux-tools-types";

describe('Setting defaults', () => {

    it('mergeUi5', async () => {
        const testData: { input: UI5, expected: UI5}[] = [
            { input: {}, expected: {
                version: '1.84.0',
                minVersion: '1.60',
                descriptorVersion: '1.12.0',
                typesVersion: '1.84.0' }
            },
            { input: { version: '1.72.0'}, expected: {
                version: '1.72.0',
                minVersion: '1.60',
                descriptorVersion: '1.12.0',
                typesVersion: '1.71.18' }
            }
        ];

        testData.forEach(test => {
            expect(mergeUi5(test.input)).toEqual(test.expected);
        });

    });
});
