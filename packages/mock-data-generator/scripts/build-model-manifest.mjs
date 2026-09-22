#!/usr/bin/env node
/**
 * Regenerate resources/models/manifest.json from the artifacts on disk.
 *
 * Every file's bytes and sha256 are recomputed, component fingerprints and the manifest revision
 * are derived from content, the classifier contract follows head.json, and the optional
 * relevance head is declared when present. provenance.reviewStatus is only set to 'approved'
 * when an explicit review record is supplied.
 *
 * Usage: node scripts/build-model-manifest.mjs [--resources resources/models] [--review-status approved --review-record FILE] [--check]
 */
import { createHash } from 'node:crypto';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const argument = (name) => {
    const index = process.argv.indexOf(name);
    return index < 0 ? undefined : process.argv[index + 1];
};
const resources = resolve(argument('--resources') ?? 'resources/models');
const reviewStatus = argument('--review-status');
const reviewRecord = argument('--review-record');
const checkOnly = process.argv.includes('--check');
const RELEVANCE_HEAD_PATH = 'classifier/relevance-head.json';
const CONCEPT_HEAD_PATH = 'classifier/concept-head.json';
const RELEVANCE_ENCODER_PATH = 'classifier/relevance-encoder.onnx';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const canonicalJson = (value) => JSON.stringify(sortKeys(value));
function sortKeys(value) {
    if (Array.isArray(value)) return value.map(sortKeys);
    if (value && typeof value === 'object')
        return Object.fromEntries(
            Object.keys(value)
                .sort()
                .map((key) => [key, sortKeys(value[key])])
        );
    return value;
}

/**
 * Compute the content-derived manifest from a template manifest.
 *
 * @param {object} template current manifest
 * @param {(path: string) => Promise<{ bytes: number, sha256: string } | undefined>} describe file describer
 * @param {object} head parsed classifier head
 * @returns {Promise<object>} regenerated manifest
 */
export async function buildModelManifest(template, describe, head) {
    const manifest = structuredClone(template);
    for (const component of manifest.components) {
        const files = [];
        for (const file of component.files) {
            const described = await describe(file.path);
            if (!described) throw new Error(`declared model artifact is missing: ${file.path}`);
            files.push({ ...file, bytes: described.bytes, sha256: described.sha256 });
        }
        if (component.kind === 'classifier') {
            for (const [role, path] of [
                ['relevance-head', RELEVANCE_HEAD_PATH],
                ['relevance-encoder', RELEVANCE_ENCODER_PATH],
                ['concept-head', CONCEPT_HEAD_PATH]
            ]) {
                const present = await describe(path);
                const declared = files.find((file) => file.role === role);
                if (present && !declared) files.push({ role, path, bytes: present.bytes, sha256: present.sha256 });
                if (!present && declared) throw new Error(`${role} is declared but the file is missing`);
            }
            component.contract = { ...component.contract, inputFormat: head.inputFormat ?? 'v1' };
            const encoder = files.find((file) => file.role === 'encoder');
            const vocabulary = files.find((file) => file.role === 'vocabulary');
            if (
                head.inputFormat === 'v3' &&
                (head.encoderSha256 !== encoder?.sha256 || head.tokenizerSha256 !== vocabulary?.sha256)
            ) {
                throw new Error('v3 head encoder/vocabulary fingerprints do not match the packaged artifacts');
            }
        }
        component.files = files;
        component.fingerprint = sha256(
            [...files]
                .sort((a, b) => a.role.localeCompare(b.role))
                .map((file) => `${file.role}\0${file.path}\0${file.sha256}\n`)
                .join('')
        );
    }
    manifest.datasets = await Promise.all(
        (manifest.datasets ?? []).map(async (dataset) => {
            const described = await describe(join('..', '..', dataset.path));
            if (!described) throw new Error(`declared dataset is missing: ${dataset.path}`);
            return { ...dataset, bytes: described.bytes, sha256: described.sha256 };
        })
    );
    manifest.revision = sha256(
        canonicalJson({
            bundleId: manifest.bundleId,
            runtime: manifest.runtime,
            components: manifest.components.map((component) => ({
                id: component.id,
                fingerprint: component.fingerprint
            })),
            datasets: manifest.datasets.map((dataset) => ({ id: dataset.id, sha256: dataset.sha256 }))
        })
    );
    return manifest;
}

/** Derive the fingerprint and revision expected for a manifest's declared files (no filesystem). */
export function expectedManifestIdentity(manifest) {
    const components = manifest.components.map((component) => ({
        id: component.id,
        fingerprint: sha256(
            [...component.files]
                .sort((a, b) => a.role.localeCompare(b.role))
                .map((file) => `${file.role}\0${file.path}\0${file.sha256}\n`)
                .join('')
        )
    }));
    const revision = sha256(
        canonicalJson({
            bundleId: manifest.bundleId,
            runtime: manifest.runtime,
            components,
            datasets: (manifest.datasets ?? []).map((dataset) => ({ id: dataset.id, sha256: dataset.sha256 }))
        })
    );
    return { components, revision };
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
    const manifestPath = join(resources, 'manifest.json');
    const template = JSON.parse(await readFile(manifestPath, 'utf8'));
    const head = JSON.parse(await readFile(join(resources, 'classifier', 'head.json'), 'utf8'));
    const describe = async (path) => {
        try {
            const absolute = resolve(resources, path);
            const info = await stat(absolute);
            if (!info.isFile()) return undefined;
            return { bytes: info.size, sha256: sha256(await readFile(absolute)) };
        } catch (error) {
            if (error?.code === 'ENOENT') return undefined;
            throw error;
        }
    };
    const manifest = await buildModelManifest(template, describe, head);
    if (reviewStatus !== undefined) {
        if (reviewStatus !== 'approved' || !reviewRecord)
            throw new Error('--review-status approved requires --review-record FILE');
        const record = await readFile(resolve(reviewRecord));
        manifest.provenance = { ...manifest.provenance, reviewStatus: 'approved', reviewRecordSha256: sha256(record) };
    } else {
        manifest.provenance = {
            ...manifest.provenance,
            reviewStatus:
                template.provenance?.reviewStatus === 'approved'
                    ? 'development'
                    : (template.provenance?.reviewStatus ?? 'development')
        };
    }
    const serialized = `${JSON.stringify(manifest, null, 4)}\n`;
    if (checkOnly) {
        const current = await readFile(manifestPath, 'utf8');
        const same = current === serialized;
        process.stdout.write(`${JSON.stringify({ upToDate: same, revision: manifest.revision })}\n`);
        process.exit(same ? 0 : 1);
    }
    await writeFile(manifestPath, serialized, 'utf8');
    process.stdout.write(
        `${JSON.stringify({ revision: manifest.revision, components: manifest.components.map((component) => ({ id: component.id, fingerprint: component.fingerprint, inputFormat: component.contract?.inputFormat, files: component.files.map((file) => file.role) })), reviewStatus: manifest.provenance.reviewStatus })}\n`
    );
}
