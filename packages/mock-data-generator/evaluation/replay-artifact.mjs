import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [packageRoot, metadataPath, protocol, evidencePath] = process.argv.slice(2);
if (!packageRoot || !metadataPath || !['2.0', '4.0'].includes(protocol)) {
    throw new TypeError('Usage: node replay-artifact.mjs PACKAGE_ROOT METADATA_XML 2.0|4.0 [EVIDENCE_JSON]');
}
const metadata = await readFile(resolve(metadataPath), 'utf8');
const evidence = evidencePath ? JSON.parse(await readFile(resolve(evidencePath), 'utf8')) : {};
const targets = [...metadata.matchAll(/<EntitySet\s+Name="([^"]+)"/gu)].map((match) => ({
    name: match[1],
    kind: 'entity-set'
}));
const digest = (value) => createHash('sha256').update(value).digest('hex');
const mockgen = await import(pathToFileURL(resolve(packageRoot, 'dist/public.js')).href);
const generator = await mockgen.createMockDataGenerator({ executionMode: 'api' });
try {
    const request = {
        metadata: { format: 'edmx', content: metadata },
        service: { urlPath: `/baseline/${basename(metadataPath)}`, odataVersion: protocol },
        targets,
        existingData: evidence
    };
    const options = { mode: 'deterministic', seed: 42, rowsPerEntity: 4 };
    const result = await generator.generateService(request, options);
    process.stdout.write(
        `${JSON.stringify({
            apiVersion: mockgen.getMockDataGeneratorInfo().apiVersion,
            metadataSha256: digest(metadata),
            evidenceSha256: digest(JSON.stringify(evidence)),
            seed: options.seed,
            rowsPerEntity: options.rowsPerEntity,
            protocol,
            targetCount: targets.length,
            generatedCount: Object.keys(result.resources).length,
            generatedSha256: digest(JSON.stringify(result.resources)),
            executionMode: result.executionMode,
            coverage: result.semanticCoverage,
            diagnosticCodes: result.diagnostics.map(({ code }) => code)
        })}\n`
    );
} finally {
    await generator.dispose();
}
