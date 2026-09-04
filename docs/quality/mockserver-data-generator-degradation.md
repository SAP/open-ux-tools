# Mockserver data generator degradation evidence

Date: 2026-09-04

This report records the local executable evidence that learned-model,
acquisition, cache, cancellation, and provider failures do not prevent the
standard FE mockserver from serving structurally valid fallback data. The
canonical tests live with the production implementation in `open-ux-tools`;
the successful pilot repository is not used as a writable evidence store.

## Product-level scenarios

| Scenario | Executable evidence | Expected product behavior |
| --- | --- | --- |
| Missing model on offline first use | `tests/integration/mockserver-data-generator/src/degradation/provider-degradation.test.ts` | No network request; one complete deterministic row; stable `MODEL_CACHE_UNAVAILABLE` diagnostic |
| Missing optional learned runtime | `tests/integration/mockserver-data-generator/src/degradation/provider-degradation.test.ts`; `packages/mockserver-data-generator/test/unit/learned-runtime.test.ts` | The affected learned tier is unavailable and lower tiers fill every required field |
| Corrupt or truncated download | `packages/mockserver-data-generator/test/unit/model-downloader.test.ts` | No partial artifact is published; provider-level runtime failure degrades to deterministic output |
| Concurrent process acquisition | `tests/integration/mockserver-data-generator/src/degradation/model-cache-process-concurrency.test.ts` | Two independent Node processes share one immutable download and observe one verified publication without stale lock/partial artifacts |
| Size or checksum mismatch | `packages/mockserver-data-generator/test/unit/model-downloader.test.ts`; `packages/mockserver-data-generator/test/unit/model-cache.test.ts` | Invalid bytes never become a verified cache entry |
| Inference timeout | `packages/mockserver-data-generator/test/unit/fe-mockserver.test.ts`; `packages/mockserver-data-generator/test/unit/api.test.ts` | The timed-out tier opens its process-local circuit and deterministic fallback remains active |
| Malformed model output | `packages/mockserver-data-generator/test/unit/sft-runtime.test.ts`; `packages/mockserver-data-generator/test/unit/api.test.ts` | Off-contract output is rejected before publication and fallback values remain valid |
| Oversized EDMX or CSN | `packages/mockserver-data-generator/test/unit/api.test.ts`; `packages/mockserver-data-generator/test/unit/fe-mockserver.test.ts`; `packages/mockserver-data-generator-cap/test/plugin.test.ts` | Input above 32 MiB UTF-8 is rejected before hashing or parsing; FE uses standard host fallback and CAP startup remains available with stable `METADATA_INPUT_TOO_LARGE` reporting |
| Generated-data cache corruption | `packages/mockserver-data-generator/test/unit/generated-data-cache.test.ts`; `packages/mockserver-data-generator/test/unit/fe-mockserver.test.ts` | The entry is quarantined and the service is regenerated |
| Read-only generated-data cache | `packages/mockserver-data-generator/test/unit/fe-mockserver.test.ts`; `packages/mockserver-data-generator-cap/test/plugin.test.ts` | FE and CAP retain complete generated rows, emit a stable warning, and continue without caching |
| Cancellation | `packages/mockserver-data-generator/test/unit/model-downloader.test.ts`; `packages/mockserver-data-generator/test/unit/fe-mockserver.test.ts` | No late artifact is published; host cancellation does not permanently poison a learned tier |
| Provider package load failure | `packages/fe-mockserver-core/test/unit/mockDataGenerator.test.ts` in `open-ux-odata` | The standard mockserver starts and retains built-in generation |
| Retry policy | `tests/integration/mockserver-data-generator/src/degradation/provider-degradation.test.ts` | A non-cancellation initialization failure is attempted once per provider lifecycle and becomes eligible again for a fresh lifecycle |
| Diagnostic privacy | `tests/integration/mockserver-data-generator/src/degradation/provider-degradation.test.ts`; package boundary tests | Logs and diagnostics expose stable codes, not raw metadata, generated values, runtime failure text, or local model paths |

The acquisition and provider checks are intentionally composed. Downloader
tests prove that corrupt bytes cannot be published, while the exported-provider
tests prove that any resulting initialization failure returns complete fallback
data. This keeps the download fixtures tiny without replacing the real provider
boundary with a test-only implementation.

## Verification snapshot

Current local snapshot:

| Scope | Result |
| --- | ---: |
| `@sap-ux/mockserver-data-generator` | 23 suites, 179 tests passed; 85.44% statement coverage |
| MockGen integration workspace | 11 suites, 98 tests passed |
| Affected builds | Passed |
| Affected lint | Zero errors |
| Frozen workspace install | Passed |
| Installed parser contract | `fast-xml-parser@5.10.1` |

The parser version is protected by a package-scoped pnpm override. A normal or
frozen workspace install therefore cannot silently restore the repository-wide
`5.8.0` override inside MockGen.

## Remaining boundary

These checks are local macOS evidence. Node/OS, BAS, proxy, read-only-cache,
process-tree memory, and published-artifact validation remain release-platform
gates. The degradation results do not replace the independent realism review
or model-governance approval.
