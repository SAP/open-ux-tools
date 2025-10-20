import { getFioriRules } from '../../../src/rules/get-fiori-rules';

describe('getFioriRules', () => {
    test('should return Fiori rules content as string', () => {
        const rules = getFioriRules();

        expect(typeof rules).toBe('string');
        expect(rules.length).toBeGreaterThan(0);
    });

    test('should contain expected rule sections', () => {
        const rules = getFioriRules();

        // Verify key sections exist
        expect(rules).toContain('Rules for creation or modification of SAP Fiori elements apps');
        expect(rules).toContain('List Report');
        expect(rules).toContain('ObjectPage');
    });

    test('should contain UUID requirements', () => {
        const rules = getFioriRules();

        expect(rules).toContain('UUID');
        expect(rules).toContain('primary keys');
    });

    test('should contain data model requirements', () => {
        const rules = getFioriRules();

        expect(rules).toContain('data model');
        expect(rules).toContain('entity');
        expect(rules).toContain('navigation properties');
    });

    test('should contain preview instructions', () => {
        const rules = getFioriRules();

        expect(rules).toContain('npm run watch');
    });

    test('should contain MCP server references', () => {
        const rules = getFioriRules();

        expect(rules).toContain('Fiori MCP server');
    });

    test('should contain sample data format requirements', () => {
        const rules = getFioriRules();

        expect(rules).toContain('CSV');
        expect(rules).toContain('sample data');
    });
});
