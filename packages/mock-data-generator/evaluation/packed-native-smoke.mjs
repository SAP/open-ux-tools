#!/usr/bin/env node
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const installRoot = process.argv[2];
const packageName = process.argv[3] ?? '@sap-ux/mock-data-generator';
if (!installRoot) {
    throw new Error(
        'Usage: packed-native-smoke.mjs /isolated/npm/install/root [@sap-ux/mock-data-generator|@unseen/mock-data-generator]'
    );
}
if (!['@sap-ux/mock-data-generator', '@unseen/mock-data-generator'].includes(packageName)) {
    throw new TypeError('Unsupported package name for the native smoke comparison');
}
const packageEntry = join(resolve(installRoot), 'node_modules', ...packageName.split('/'), 'dist', 'index.js');
const { createMockDataGenerator, getMockDataGeneratorInfo } = await import(pathToFileURL(packageEntry).href);
const metadata = `<?xml version="1.0"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Smoke">
    <EntityType Name="Record"><Key><PropertyRef Name="ID"/></Key>
      <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
      <Property Name="Label" Type="Edm.String" Nullable="false" MaxLength="40"/>
    </EntityType>
    <EntityContainer Name="Container"><EntitySet Name="Records" EntityType="Smoke.Record"/></EntityContainer>
  </Schema></edmx:DataServices>
</edmx:Edmx>`;
const request = {
    metadata: { format: 'edmx', content: metadata },
    service: { urlPath: '/records', odataVersion: '4.0' },
    targets: [{ name: 'Records', kind: 'entity-set' }],
    existingData: {}
};
const session = await createMockDataGenerator({ executionMode: 'api' });
try {
    const runs = [];
    for (const phase of ['cold', 'warm']) {
        const started = performance.now();
        const result = await session.generateService(request, {
            mode: 'auto',
            rowsPerEntity: 1,
            seed: 42,
            sftBudgetMs: 3000,
            sftTimeoutMs: 3000
        });
        runs.push({
            phase,
            durationMs: Math.round(performance.now() - started),
            executionMode: result.executionMode,
            routing: result.routing,
            sft: {
                eligibleSlots: result.statistics.sft.eligibleSlots,
                acceptedSlots: result.statistics.sft.acceptedSlots,
                fallbackSlots: result.statistics.sft.fallbackSlots
            },
            validation: result.validation,
            rowCount: result.resources.Records?.length ?? 0,
            rssBytes: process.memoryUsage().rss
        });
    }
    process.stdout.write(`${JSON.stringify({ info: getMockDataGeneratorInfo(), runs })}\n`);
} finally {
    await session.dispose();
}
