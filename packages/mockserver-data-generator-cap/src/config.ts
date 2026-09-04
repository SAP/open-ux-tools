import type { MockDataGeneratorOptions } from '@sap-ux/mockserver-data-generator';

type UnknownRecord = Record<string, unknown>;

export interface CapModelConfiguration {
    manifestPath: string;
    cacheDirectory?: string;
    offline: boolean;
}

export interface CapGeneratedDataCacheConfiguration {
    directory?: string;
}

export type CapGeneratorConfiguration =
    | { enabled: false }
    | {
          enabled: true;
          generation: MockDataGeneratorOptions;
          model?: CapModelConfiguration;
          generatedDataCache?: CapGeneratedDataCacheConfiguration;
      };

function isRecord(value: unknown): value is UnknownRecord {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function profiles(value: unknown): ReadonlySet<string> {
    if (typeof value === 'string') {
        return new Set(value.split(',').map((profile) => profile.trim()));
    }
    if (Array.isArray(value)) {
        return new Set(value.filter((profile): profile is string => typeof profile === 'string'));
    }
    if (value instanceof Set) {
        return new Set([...value].filter((profile): profile is string => typeof profile === 'string'));
    }
    return new Set();
}

function optionalString(value: unknown, name: string): string | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new TypeError(`${name} must be a non-empty string`);
    }
    return value;
}

function optionalInteger(value: unknown, name: string): number | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (!Number.isSafeInteger(value)) {
        throw new TypeError(`${name} must be an integer`);
    }
    return value as number;
}

function generationOptions(raw: UnknownRecord): MockDataGeneratorOptions {
    const rowsPerEntity = optionalInteger(raw.rowsPerEntity, 'rowsPerEntity');
    if (rowsPerEntity !== undefined && (rowsPerEntity < 0 || rowsPerEntity > 1_000)) {
        throw new TypeError('rowsPerEntity must be between 0 and 1000');
    }
    const seed = optionalInteger(raw.seed, 'seed');
    const sftTimeoutMs = optionalInteger(raw.sftTimeoutMs, 'sftTimeoutMs');
    if (sftTimeoutMs !== undefined && (sftTimeoutMs <= 0 || sftTimeoutMs > 60_000)) {
        throw new TypeError('sftTimeoutMs must be between 1 and 60000');
    }
    const locale = optionalString(raw.locale, 'locale');
    const mode = raw.mode;
    if (mode !== undefined && !['auto', 'deterministic', 'learned'].includes(String(mode))) {
        throw new TypeError('mode must be auto, deterministic, or learned');
    }
    return Object.freeze({
        ...(rowsPerEntity === undefined ? {} : { rowsPerEntity }),
        ...(seed === undefined ? {} : { seed }),
        ...(sftTimeoutMs === undefined ? {} : { sftTimeoutMs }),
        ...(locale === undefined ? {} : { locale }),
        ...(mode === undefined ? {} : { mode: mode as MockDataGeneratorOptions['mode'] })
    });
}

function modelConfiguration(raw: UnknownRecord): CapModelConfiguration | undefined {
    const manifestPath = optionalString(raw.modelManifestPath, 'modelManifestPath');
    const cacheDirectory = optionalString(raw.modelCacheDirectory, 'modelCacheDirectory');
    if (raw.modelOffline !== undefined && typeof raw.modelOffline !== 'boolean') {
        throw new TypeError('modelOffline must be a boolean');
    }
    return manifestPath
        ? Object.freeze({
              manifestPath,
              ...(cacheDirectory ? { cacheDirectory } : {}),
              offline: raw.modelOffline === true
          })
        : undefined;
}

function generatedDataCacheConfiguration(raw: UnknownRecord): CapGeneratedDataCacheConfiguration | undefined {
    const directory = optionalString(raw.generatedDataCacheDirectory, 'generatedDataCacheDirectory');
    if (raw.generatedDataCache !== undefined && typeof raw.generatedDataCache !== 'boolean') {
        throw new TypeError('generatedDataCache must be a boolean');
    }
    if (raw.generatedDataCache === false && directory) {
        throw new TypeError('Generated-data cache directory cannot be set when caching is disabled');
    }
    return raw.generatedDataCache === false ? undefined : Object.freeze({ ...(directory ? { directory } : {}) });
}

/**
 * Resolve the defense-in-depth native CAP opt-in.
 *
 * @param environment Resolved cds.env-compatible data.
 * @returns Validated generator configuration.
 */
export function resolveCapConfiguration(environment: unknown): CapGeneratorConfiguration {
    const env = isRecord(environment) ? environment : {};
    const activeProfiles = profiles(env.profiles);
    const raw = isRecord(env.mockserverDataGenerator) ? env.mockserverDataGenerator : {};
    if (
        raw.enabled !== true ||
        activeProfiles.has('production') ||
        (!activeProfiles.has('development') && !activeProfiles.has('test'))
    ) {
        return Object.freeze({ enabled: false });
    }

    const generation = generationOptions(raw);
    const model = modelConfiguration(raw);
    const generatedDataCache = generatedDataCacheConfiguration(raw);
    return Object.freeze({
        enabled: true,
        generation,
        ...(model ? { model } : {}),
        ...(generatedDataCache ? { generatedDataCache } : {})
    });
}
