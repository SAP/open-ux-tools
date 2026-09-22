// Release check: runs real generations through the SAP Fiori tools editor's own worker mapping and
// IPC validator — the exact path a BAS user hits — and fails if the editor would reject any result.
// Unit tests on either side cannot catch a statistic that each side computes consistently with
// itself but not with the other.
//
// Usage: node editor-contract-check.mjs PACKAGE_ROOT EDITOR_MOCKGEN_DIST [METADATA.xml ...]
//   EDITOR_MOCKGEN_DIST is the editor's compiled `dist/src/mockgen` directory.
//   Without metadata files, the package's Travel V2 and finance fixtures are used.
import { readFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

const [packageArgument, editorArgument, ...metadataFiles] = process.argv.slice(2);
if (!packageArgument || !editorArgument) {
    throw new TypeError('Usage: editor-contract-check.mjs PACKAGE_ROOT EDITOR_MOCKGEN_DIST [METADATA.xml ...]');
}
const packageRoot = resolve(packageArgument);
const editorDist = resolve(editorArgument);
const api = await import(join(packageRoot, 'dist/public.js'));
const { generateMockgenDatasets } = await import(join(editorDist, 'worker-core.js'));
const { isValidWorkerMessage } = await import(join(editorDist, 'protocol.js'));

const files = metadataFiles.length
    ? metadataFiles.map((file) => resolve(file))
    : [
          join(packageRoot, 'test/unit/travel-v2.metadata.xml'),
          join(packageRoot, 'test/unit/finance-manage.metadata.xml')
      ];

let failures = 0;
for (const file of files) {
    const metadataXml = await readFile(file, 'utf8');
    const targetEntitySets = [
        ...new Set([...metadataXml.matchAll(/<EntitySet\s+Name="([^"]+)"/gu)].map((match) => match[1]))
    ];
    const odataVersion = /Version="4\.0"/u.test(metadataXml) ? '4.0' : '2.0';
    try {
        const generated = await generateMockgenDatasets(
            {
                metadataXml,
                serviceUrlPath: `/${basename(file)}`,
                odataVersion,
                targetEntitySets,
                rowCount: 10,
                existingData: {}
            },
            api
        );
        const result = {
            generatedEntities: generated.datasets.map(({ entitySet }) => entitySet),
            durationMs: 1,
            diagnostics: generated.diagnostics
        };
        const valid = isValidWorkerMessage({ type: 'result', result });
        process.stdout.write(`${JSON.stringify({ file: basename(file), valid })}\n`);
        failures += valid ? 0 : 1;
    } catch (error) {
        failures += 1;
        process.stdout.write(
            `${JSON.stringify({ file: basename(file), valid: false, error: String(error?.message ?? error).slice(0, 200) })}\n`
        );
    }
}
process.exitCode = failures ? 1 : 0;
