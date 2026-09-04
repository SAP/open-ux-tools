import { createHash } from 'node:crypto';

const SHA_256 = /^[a-f\d]{64}$/u;
const IMMUTABLE_COMMIT = /^[a-f\d]{40,64}$/u;
const MINIMUM_SAMPLES = 5;
const MAXIMUM_SAMPLES = 100;
const ACQUISITION_TIMEOUT_MS = 30_000;
const HOST_PACKAGE_NAMES = new Set(['@sap-ux/fe-mockserver-core', '@sap-ux/ui5-middleware-fe-mockserver']);

function canonicalJson(value) {
    if (Array.isArray(value)) {
        return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`;
    }
    if (value !== null && typeof value === 'object') {
        return `{${Object.keys(value)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
            .join(',')}}`;
    }
    return JSON.stringify(value);
}

function fingerprint(value) {
    return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

function record(value, label) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError(`${label} must be an object`);
    }
    return value;
}

function string(value, label) {
    if (typeof value !== 'string' || value.length === 0) {
        throw new TypeError(`${label} must be a non-empty string`);
    }
    return value;
}

function sha256(value, label) {
    const result = string(value, label);
    if (!SHA_256.test(result)) {
        throw new TypeError(`${label} must be a lowercase SHA-256`);
    }
    return result;
}

function commit(value, label) {
    const result = string(value, label);
    if (!IMMUTABLE_COMMIT.test(result)) {
        throw new TypeError(`${label} must be an immutable commit or content hash`);
    }
    return result;
}

function duration(value, label) {
    if (!Number.isFinite(value) || value < 0) {
        throw new TypeError(`${label} must be a non-negative finite number`);
    }
    return value;
}

function samples(value, label, normalize) {
    if (!Array.isArray(value) || value.length < MINIMUM_SAMPLES || value.length > MAXIMUM_SAMPLES) {
        throw new TypeError(`${label} must contain at least ${MINIMUM_SAMPLES} and at most ${MAXIMUM_SAMPLES} samples`);
    }
    return value.map((entry, index) => normalize(entry, `${label} sample ${index}`));
}

function nearestRank(values, fraction) {
    const ordered = [...values].sort((left, right) => left - right);
    return ordered[Math.max(0, Math.ceil(ordered.length * fraction) - 1)];
}

function summary(values) {
    return Object.freeze({
        samples: values.length,
        p50: nearestRank(values, 0.5),
        p95: nearestRank(values, 0.95)
    });
}

function normalizeCandidate(value) {
    const input = record(value, 'integration candidate');
    const generator = record(input.generator, 'integration generator candidate');
    if (!Array.isArray(input.hostPackages)) {
        throw new TypeError('integration host packages must be an array');
    }
    const hostPackages = input.hostPackages.map((entry, index) => {
        const label = `integration host package ${index}`;
        const host = record(entry, label);
        return Object.freeze({
            packageName: string(host.packageName, `${label} name`),
            packageVersion: string(host.packageVersion, `${label} version`),
            packageArchiveSha256: sha256(host.packageArchiveSha256, `${label} archive SHA-256`),
            sourceCommit: commit(host.sourceCommit, `${label} source commit`)
        });
    });
    if (
        hostPackages.length !== HOST_PACKAGE_NAMES.size ||
        hostPackages.some(({ packageName }) => !HOST_PACKAGE_NAMES.has(packageName)) ||
        new Set(hostPackages.map(({ packageName }) => packageName)).size !== HOST_PACKAGE_NAMES.size
    ) {
        throw new TypeError('integration evidence must bind the exact FE mockserver core and middleware packages');
    }
    const model = record(input.model, 'integration model candidate');
    const runtime = record(input.runtime, 'integration runtime candidate');
    return Object.freeze({
        generator: Object.freeze({
            packageName: string(generator.packageName, 'integration generator package name'),
            packageVersion: string(generator.packageVersion, 'integration generator package version'),
            packageArchiveSha256: sha256(
                generator.packageArchiveSha256,
                'integration generator package archive SHA-256'
            ),
            entrySha256: sha256(generator.entrySha256, 'integration generator entry SHA-256'),
            buildFingerprint: sha256(generator.buildFingerprint, 'integration generator build fingerprint'),
            sourceCommit: commit(generator.sourceCommit, 'integration generator source commit')
        }),
        hostPackages: Object.freeze(
            [...hostPackages].sort((left, right) => left.packageName.localeCompare(right.packageName))
        ),
        model: Object.freeze({
            manifestSha256: sha256(model.manifestSha256, 'integration model manifest SHA-256'),
            revision: commit(model.revision, 'integration model revision')
        }),
        runtime: Object.freeze({
            packageName: string(runtime.packageName, 'integration runtime package name'),
            packageVersion: string(runtime.packageVersion, 'integration runtime package version'),
            ...(runtime.packageArchiveSha256 === undefined
                ? {}
                : {
                      packageArchiveSha256: sha256(
                          runtime.packageArchiveSha256,
                          'integration runtime package archive SHA-256'
                      )
                  })
        })
    });
}

function normalizeMeasurement(value) {
    const input = record(value, 'integration performance measurement');
    const environment = record(input.environment, 'integration environment');
    const fixture = record(input.fixture, 'integration fixture');
    const observations = record(input.observations, 'integration observations');
    const cold = samples(observations.cold, 'cold observations', (entry, label) => {
        const observation = record(entry, label);
        return Object.freeze({
            runtimeInitializationMs: duration(observation.runtimeInitializationMs, `${label} runtime initialization`),
            wholeServiceGenerationMs: duration(
                observation.wholeServiceGenerationMs,
                `${label} whole-service generation`
            ),
            hostProviderMs: duration(observation.hostProviderMs, `${label} host provider`)
        });
    });
    const warmCache = samples(observations.warmCache, 'warm-cache observations', (entry, label) => {
        const observation = record(entry, label);
        if (observation.modelSessionInitialized !== false) {
            throw new Error(`${label} must not initialize a model session`);
        }
        return Object.freeze({
            generatedDataCacheHitMs: duration(observation.generatedDataCacheHitMs, `${label} generated-data cache hit`),
            hostProviderMs: duration(observation.hostProviderMs, `${label} host provider`),
            modelSessionInitialized: false
        });
    });
    const firstUseAcquisitionMs = samples(
        observations.firstUseAcquisitionMs,
        'first-use acquisition observations',
        (entry, label) => duration(entry, label)
    );
    if (input.acquisitionTimeoutMs !== ACQUISITION_TIMEOUT_MS) {
        throw new TypeError(`integration acquisition timeout must be exactly ${ACQUISITION_TIMEOUT_MS} ms`);
    }
    return Object.freeze({
        candidate: normalizeCandidate(input.candidate),
        environment: Object.freeze({
            node: string(environment.node, 'integration Node version'),
            platform: string(environment.platform, 'integration platform'),
            architecture: string(environment.architecture, 'integration architecture'),
            cpu: string(environment.cpu, 'integration CPU')
        }),
        fixture: Object.freeze({
            fingerprint: sha256(fixture.fingerprint, 'integration fixture fingerprint'),
            metadataSha256: sha256(fixture.metadataSha256, 'integration fixture metadata SHA-256'),
            applicationManifestSha256: sha256(
                fixture.applicationManifestSha256,
                'integration fixture application manifest SHA-256'
            ),
            mockConfigurationSha256: sha256(
                fixture.mockConfigurationSha256,
                'integration fixture mock configuration SHA-256'
            ),
            servicePath: string(fixture.servicePath, 'integration fixture service path'),
            entitySet: string(fixture.entitySet, 'integration fixture entity set')
        }),
        observations: Object.freeze({
            cold: Object.freeze(cold),
            warmCache: Object.freeze(warmCache),
            firstUseAcquisitionMs: Object.freeze(firstUseAcquisitionMs)
        }),
        acquisitionTimeoutMs: ACQUISITION_TIMEOUT_MS
    });
}

function reportFromMeasurement(measurement, createdAt) {
    const coldServiceGenerationMs = measurement.observations.cold.map(
        ({ wholeServiceGenerationMs }) => wholeServiceGenerationMs
    );
    const hostProviderMs = measurement.observations.cold.map(({ hostProviderMs }) => hostProviderMs);
    const warmCacheStartupMs = measurement.observations.warmCache.map(
        ({ generatedDataCacheHitMs }) => generatedDataCacheHitMs
    );
    const report = {
        schemaVersion: 1,
        createdAt,
        candidate: measurement.candidate,
        environment: measurement.environment,
        fixture: measurement.fixture,
        protocols: Object.freeze({
            coldService:
                'fresh Fiori/UI5 process, verified warm model artifacts, generated-data cache disabled, provider timing',
            warmCache:
                'fresh Fiori/UI5 process, verified whole-service cache hit, provider timing, no learned runtime initialization',
            firstUseAcquisition:
                'empty model cache, loopback HTTP mirror over exact verified artifacts, 30000 ms production acquisition timeout',
            hostProvider: 'host monotonic duration covering provider execution and defensive result validation',
            percentile: 'nearest-rank over uncensored observations; timeout samples remain in the denominator'
        }),
        observations: measurement.observations,
        acquisitionTimeoutMs: measurement.acquisitionTimeoutMs,
        metrics: Object.freeze({
            coldServiceGenerationMs: summary(coldServiceGenerationMs),
            warmCacheStartupMs: summary(warmCacheStartupMs),
            firstUseAcquisitionMs: summary(measurement.observations.firstUseAcquisitionMs),
            hostProviderMs: summary(hostProviderMs)
        }),
        integrationReady: true
    };
    return Object.freeze({ ...report, reportFingerprint: fingerprint(report) });
}

/** Build a fingerprinted report from raw integration observations. */
export function buildIntegrationPerformanceReport(value) {
    return reportFromMeasurement(normalizeMeasurement(value), new Date().toISOString());
}

function assertEqual(actual, expected, label) {
    if (actual !== expected) {
        throw new Error(`integration performance report ${label} does not match the current measurement`);
    }
}

/** Validate an integration report and return only timings bound to the current footprint candidate. */
export function validateIntegrationPerformanceReport(value, expected) {
    const report = record(value, 'integration performance report');
    const reportFingerprint = sha256(report.reportFingerprint, 'integration performance report fingerprint');
    const unsigned = { ...report };
    delete unsigned.reportFingerprint;
    if (fingerprint(unsigned) !== reportFingerprint) {
        throw new Error('integration performance report fingerprint does not match');
    }
    if (report.schemaVersion !== 1 || report.integrationReady !== true) {
        throw new Error('integration performance report is not complete release evidence');
    }
    const rebuilt = reportFromMeasurement(
        normalizeMeasurement(report),
        string(report.createdAt, 'report creation time')
    );
    if (canonicalJson(rebuilt) !== canonicalJson(report)) {
        throw new Error('integration performance report derived metrics or protocols do not match its observations');
    }
    const bindings = record(expected, 'integration performance bindings');
    const generator = rebuilt.candidate.generator;
    const model = rebuilt.candidate.model;
    const runtime = rebuilt.candidate.runtime;
    for (const [actual, expectedValue, label] of [
        [generator.packageName, bindings.packageName, 'generator package'],
        [generator.packageVersion, bindings.packageVersion, 'generator package version'],
        [generator.packageArchiveSha256, bindings.packageArchiveSha256, 'generator package archive SHA-256'],
        [generator.entrySha256, bindings.generatorEntrySha256, 'generator entry SHA-256'],
        [generator.buildFingerprint, bindings.generatorBuildFingerprint, 'generator build fingerprint'],
        [generator.sourceCommit, bindings.codeCommit, 'generator source commit'],
        [model.manifestSha256, bindings.modelManifestSha256, 'model manifest SHA-256'],
        [model.revision, bindings.modelRevision, 'model revision'],
        [runtime.packageName, bindings.runtimePackage, 'runtime package'],
        [runtime.packageVersion, bindings.runtimeVersion, 'runtime package version'],
        [runtime.packageArchiveSha256, bindings.runtimePackageArchiveSha256, 'runtime package archive SHA-256'],
        [rebuilt.environment.node, bindings.node, 'Node version'],
        [rebuilt.environment.platform, bindings.platform, 'platform'],
        [rebuilt.environment.architecture, bindings.architecture, 'architecture'],
        [rebuilt.environment.cpu, bindings.cpu, 'CPU']
    ]) {
        assertEqual(actual, expectedValue, label);
    }
    return Object.freeze({
        reportFingerprint,
        timings: Object.freeze({
            coldServiceGenerationMs: Object.freeze(
                rebuilt.observations.cold.map(({ wholeServiceGenerationMs }) => wholeServiceGenerationMs)
            ),
            warmCacheStartupMs: Object.freeze(
                rebuilt.observations.warmCache.map(({ generatedDataCacheHitMs }) => generatedDataCacheHitMs)
            ),
            firstUseAcquisitionMs: rebuilt.observations.firstUseAcquisitionMs,
            hostProviderMs: Object.freeze(rebuilt.observations.cold.map(({ hostProviderMs }) => hostProviderMs))
        })
    });
}
