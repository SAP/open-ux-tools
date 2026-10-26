import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { extractTemplateDetails } from '../../../src/template/details.js';
import type { Manifest } from '../../../src/project-spec-types.js';
import { FioriElementsVersion } from '../../../src/project-spec-types.js';
import { initI18n } from '../../../src/index.js';
import { createMemFsEditor } from '../../../src/utils/fs-adapter.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const testOutputDir = join(__dirname, 'test-output', 'details');

const POM_ARTIFACT_ID = 'fin.co.accountingimpact.display';

const POM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<project>
  <artifactId>${POM_ARTIFACT_ID}</artifactId>
  <version>1.0.0</version>
</project>`;

const baseManifest: Manifest = {
    'sap.app': {
        id: '${project.artifactId}',
        type: 'application',
        title: 'Test App'
    }
} as unknown as Manifest;

const stubGetVersion = (_m: Manifest) => FioriElementsVersion.v2;
const stubGetFloorPlan = (_m: Manifest, _v: FioriElementsVersion | undefined) => 'ListReport';

describe('template/details', () => {
    beforeEach(async () => {
        await initI18n();
        await mkdir(testOutputDir, { recursive: true });
    });

    afterEach(async () => {
        await rm(testOutputDir, { recursive: true, force: true });
    });

    describe('extractTemplateDetails', () => {
        it('resolves ${project.artifactId} from pom.xml when pom exists on disk', async () => {
            // given
            await writeFile(join(testOutputDir, 'pom.xml'), POM_XML, 'utf8');

            // when
            const result = await extractTemplateDetails(
                createMemFsEditor(),
                baseManifest,
                testOutputDir,
                '',
                '',
                stubGetVersion,
                stubGetFloorPlan
            );

            // then
            expect(result.sapAppId).toBe(POM_ARTIFACT_ID);
            expect(result.appVersion).toBe('1.0.0');
        });

        it('returns literal manifest id when pom.xml does not exist', async () => {
            // given — testOutputDir has no pom.xml

            // when
            const result = await extractTemplateDetails(
                createMemFsEditor(),
                baseManifest,
                testOutputDir,
                '',
                '',
                stubGetVersion,
                stubGetFloorPlan
            );

            // then
            expect(result.sapAppId).toBe('${project.artifactId}');
            expect(result.appVersion).toBe('');
        });

        it('returns manifest id unchanged when it has no placeholder', async () => {
            // given
            const resolvedManifest: Manifest = {
                'sap.app': { id: 'my.app.id', type: 'application', title: 'Test' }
            } as unknown as Manifest;
            await writeFile(join(testOutputDir, 'pom.xml'), POM_XML, 'utf8');

            // when
            const result = await extractTemplateDetails(
                createMemFsEditor(),
                resolvedManifest,
                testOutputDir,
                '',
                '',
                stubGetVersion,
                stubGetFloorPlan
            );

            // then
            expect(result.sapAppId).toBe('my.app.id');
        });

        it('does not override existing appVersion from pom.xml', async () => {
            // given
            await writeFile(join(testOutputDir, 'pom.xml'), POM_XML, 'utf8');

            // when
            const result = await extractTemplateDetails(
                createMemFsEditor(),
                baseManifest,
                testOutputDir,
                '',
                '2.0.0',
                stubGetVersion,
                stubGetFloorPlan
            );

            // then — existing version is kept, not overwritten by pom.xml version
            expect(result.appVersion).toBe('2.0.0');
        });

        it('keeps placeholder when pom.xml does not contain the referenced property', async () => {
            // given — pom has no <groupId> element
            await writeFile(join(testOutputDir, 'pom.xml'), POM_XML, 'utf8');
            const manifest: Manifest = {
                'sap.app': { id: '${project.groupId}', type: 'application', title: 'Test' }
            } as unknown as Manifest;

            // when
            const result = await extractTemplateDetails(
                createMemFsEditor(),
                manifest,
                testOutputDir,
                '',
                '',
                stubGetVersion,
                stubGetFloorPlan
            );

            // then — unresolvable placeholder is returned as-is
            expect(result.sapAppId).toBe('${project.groupId}');
        });
    });
});
