import type { CapRuntime } from '@sap-ux/odata-service-inquirer';
import { capTypeConversion, LEGACY_CAP_TYPE_NODE, LEGACY_CAP_TYPE_JAVA, defaultPromptValues } from '../../../src/types';
import { promptNames } from '@sap-ux/ui5-application-inquirer';

describe('Test types', () => {
    test('capTypeConversion', () => {
        expect(capTypeConversion('Node.js' as CapRuntime)).toBe('Node.js');
        expect(capTypeConversion('Java' as CapRuntime)).toBe('Java');
        expect(capTypeConversion(LEGACY_CAP_TYPE_JAVA)).toBe('Java');
        expect(capTypeConversion(LEGACY_CAP_TYPE_NODE)).toBe('Node.js');
        expect(capTypeConversion('Invalid')).toBe('Node.js');
    });

    test('defaultPromptValues - ESLint enabled by default', () => {
        expect(defaultPromptValues[promptNames.enableEslint]).toBe(true);
    });

    test('defaultPromptValues - TypeScript disabled by default', () => {
        expect(defaultPromptValues[promptNames.enableTypeScript]).toBe(false);
    });

    test('defaultPromptValues - skipAnnotations disabled by default', () => {
        expect(defaultPromptValues[promptNames.skipAnnotations]).toBe(false);
    });
});
