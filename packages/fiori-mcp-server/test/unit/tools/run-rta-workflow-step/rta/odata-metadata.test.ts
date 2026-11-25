import { buildMetadataUrl, looksLikeEdmx } from '../../../../../src/tools/run-rta-workflow-step/rta/odata-metadata.js';

describe('odata-metadata', () => {
    const SITE = 'http://localhost:8080/test/adaptation-editor.html';

    describe('buildMetadataUrl', () => {
        test.each([
            ['relative', 'api/svc/', 'http://localhost:8080/api/svc/$metadata'],
            ['leading slash', '/api/svc/', 'http://localhost:8080/api/svc/$metadata'],
            ['no trailing slash', 'api/svc', 'http://localhost:8080/api/svc/$metadata'],
            ['already $metadata', 'api/svc/$metadata', 'http://localhost:8080/api/svc/$metadata']
        ])('resolves a %s URI against the editor origin', (_label, uri, expected) => {
            expect(buildMetadataUrl(SITE, uri)).toBe(expected);
        });

        test('refuses an absolute URI that escapes the editor origin (SSRF guard)', () => {
            expect(() => buildMetadataUrl(SITE, 'https://attacker.example.com/api/svc/')).toThrow(/foreign origin/);
        });

        test('refuses a protocol-relative URI that escapes the editor origin (SSRF guard)', () => {
            expect(() => buildMetadataUrl(SITE, '//attacker.example.com/api/svc/')).toThrow(/foreign origin/);
        });
    });

    describe('looksLikeEdmx', () => {
        test.each([
            ['plain', '<edmx:Edmx><a/></edmx:Edmx>'],
            ['namespace prefix', '<m:Edmx xmlns:m="x" Version="4.0"><m:DataServices/></m:Edmx>'],
            ['no prefix', '<Edmx xmlns="x" Version="4.0"><DataServices/></Edmx>'],
            ['prolog and comment', '<?xml version="1.0"?><!-- metadata --><edmx:Edmx Version="1.0"/>'],
            ['multiple comments', '<?xml version="1.0"?><!-- a --><!-- b --><edmx:Edmx/>'],
            ['leading whitespace', '\n\t  <edmx:Edmx/>']
        ])('accepts a document whose root is Edmx: %s', (_label, body) => {
            expect(looksLikeEdmx(body)).toBe(true);
        });

        test.each([
            ['error root', '<?xml version="1.0"?><error>Backend failure</error>'],
            ['nested Edmx', '<error><edmx:Edmx/></error>'],
            ['Edmx inside comment', '<?xml version="1.0"?><error><!-- <edmx:Edmx/> --></error>'],
            ['unterminated prolog', '<?xml no close <edmx:Edmx/>'],
            ['unterminated comment', '<!-- unterminated <edmx:Edmx/>'],
            ['empty', ''],
            ['prefix without Edmx', '<EdmxLike/>']
        ])('rejects a document whose root is not Edmx: %s', (_label, body) => {
            expect(looksLikeEdmx(body)).toBe(false);
        });

        test('returns quickly on a long run of unterminated declarations (no backtracking)', () => {
            const start = Date.now();
            expect(looksLikeEdmx('<?'.repeat(500_000))).toBe(false);
            expect(Date.now() - start).toBeLessThan(1000);
        });
    });
});
