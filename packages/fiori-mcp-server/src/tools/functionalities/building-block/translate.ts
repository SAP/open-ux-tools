import { BuildingBlockType } from '@sap-ux/fe-fpm-writer';
import type { IdGeneratorFunction } from '@sap-ux/fe-fpm-writer';
import { AGGREGATION_CHILD_TYPES } from './utils.js';

/** BB types that wrap flat anchor/placement into a nested position object. */
const POSITION_WRAP_TYPES = new Set<BuildingBlockType>([
    BuildingBlockType.CustomColumn,
    BuildingBlockType.CustomFilterField,
    BuildingBlockType.CustomFormField
]);

/** BB types that get an embededFragment injected. Explicit allowlist — do not use a negative check. */
const EMBEDDED_FRAGMENT_TYPES = new Set<BuildingBlockType>([
    BuildingBlockType.CustomColumn,
    BuildingBlockType.CustomFilterField,
    BuildingBlockType.CustomFormField
]);

/**
 * Renames a field in-place only when the source exists and the target does not.
 *
 * @param data
 * @param from
 * @param to
 */
function renameField(data: Record<string, unknown>, from: string, to: string): void {
    if (data[from] !== undefined && data[to] === undefined) {
        data[to] = data[from];
        delete data[from];
    }
}

/**
 * Translates LLM-provided building block data from XML attribute names (as documented in
 * bb_macro_api.md) to the TypeScript field names expected by fe-fpm-writer's generateBuildingBlock.
 *
 * The docs and XML use attribute names like `header`, `key`, `anchor`, `placement` — but the
 * TypeScript types use `title`, `columnKey`, `position: { anchor, placement }` etc.
 *
 * @param bbData - Raw building block data from the LLM
 * @returns Translated copy ready to pass to generateBuildingBlock
 */
export function translateBuildingBlockInput(bbData: Record<string, unknown>): Record<string, unknown> {
    const type = bbData['buildingBlockType'] as BuildingBlockType;
    const data = { ...bbData };

    // Shared: anchor + placement (flat) → position: { anchor, placement }
    // Applies to CustomColumn, CustomFilterField, CustomFormField.
    // Action keeps anchor/placement flat — its TypeScript type has them as top-level fields.
    if (POSITION_WRAP_TYPES.has(type) && data['position'] === undefined) {
        if (data['anchor'] !== undefined || data['placement'] !== undefined) {
            data['position'] = { anchor: data['anchor'], placement: data['placement'] };
            delete data['anchor'];
            delete data['placement'];
        }
    }

    if (type === BuildingBlockType.CustomColumn) {
        renameField(data, 'header', 'title');
        renameField(data, 'key', 'columnKey');
    }

    if (type === BuildingBlockType.CustomFilterField) {
        renameField(data, 'key', 'filterFieldKey');
    }

    if (type === BuildingBlockType.Action) {
        renameField(data, 'key', 'actionKey');
        // XML uses press="handler.fn" but the TypeScript Action type has no press field —
        // the value must be wrapped into embeddedAction.eventHandler for generateBuildingBlock.
        if (data['press'] !== undefined && data['embeddedAction'] === undefined) {
            data['embeddedAction'] = { eventHandler: data['press'] };
            delete data['press'];
        }
    }

    return data;
}

/**
 * Resolves safe defaults for aggregation child BB types before passing data to generateBuildingBlock.
 *
 * fe-fpm-writer crashes or produces bad output when certain fields are missing:
 * - `embededFragment.name` / `embeddedAction.name` — used by setCommonDefaults to compute the fragment
 *   namespace and folder path. Defaults to a key derived from the human-readable label (or uniqueId).
 * - `position` — CustomColumn accesses position.anchor/placement unconditionally with a non-null assertion.
 *   Defaults to { placement: 'After' } so it never crashes when the user omits position.
 * - `columnKey` / `filterFieldKey` — templates default to 'myColumnKey'/'myFilterFieldKey' which are
 *   useless placeholders. We derive a meaningful key from the label instead.
 * - `eventHandler: true` — shorthand for the LLM (case 2 in the fragment handler guide).
 *   fe-fpm-writer expects { fileName }, not a boolean, so we expand it here.
 *
 * For standalone BB types (Table, FilterBar, Form, etc.) no defaults are needed — passed through as-is.
 *
 * @param bbData - Translated building block data (output of translateBuildingBlockInput)
 * @param uniqueId - Unique ID generated for this building block
 * @param generateId - ID generator function passed to generateBuildingBlock for internal element IDs
 * @returns Building block data with all required fields populated for generateBuildingBlock
 * @example
 * // LLM sends: { buildingBlockType: 'custom-column', title: 'My Rating', ... }
 * // Result:    { ..., columnKey: 'my-rating', embededFragment: { name: 'my-rating', folder: 'ext/fragment' }, position: { placement: 'After' } }
 */
export function resolveAggregationChildDefaults(
    bbData: Record<string, unknown>,
    uniqueId: string,
    generateId?: IdGeneratorFunction
): Record<string, unknown> {
    const bbType = bbData['buildingBlockType'] as BuildingBlockType;

    if (!AGGREGATION_CHILD_TYPES.has(bbType)) {
        return { ...bbData, id: uniqueId, ...(generateId && { generateId }) };
    }

    // Derive a kebab-case key from the label so the XML key attribute matches what the LLM
    // will pass as an anchor value when referencing this element from a later call.
    const titleOrLabel = (bbData['title'] ?? bbData['label'] ?? bbData['text']) as string | undefined;
    const derivedKey = titleOrLabel ? titleOrLabel.trim().toLowerCase().replace(/\s+/g, '-') : uniqueId;

    if (bbType === BuildingBlockType.CustomColumn && !bbData['columnKey']) {
        bbData['columnKey'] = derivedKey;
    }
    if (bbType === BuildingBlockType.CustomFilterField && !bbData['filterFieldKey']) {
        bbData['filterFieldKey'] = derivedKey;
    }

    const existingEmbededFragment = bbData['embededFragment'] as Record<string, unknown> | undefined;
    const existingEmbeddedAction = bbData['embeddedAction'] as Record<string, unknown> | undefined;

    // When the LLM explicitly names the fragment (embededFragment.name / embeddedAction.name), use that
    // as the base for the handler filename too — so handler and fragment share the same name.
    // Without this, resolveHandler would derive the filename from columnKey (the header-derived key),
    // producing e.g. "HeaderNewEvent.js" even when the fragment is called "FragmentNameEvent".
    const explicitFragmentName = (existingEmbededFragment?.['name'] ?? existingEmbeddedAction?.['name']) as
        string | undefined;
    const fragmentName = (explicitFragmentName ??
        bbData['columnKey'] ??
        bbData['filterFieldKey'] ??
        bbData['actionKey'] ??
        derivedKey) as string;

    // Expand eventHandler: true → { fileName } so fe-fpm-writer generates the handler file.
    const resolveHandler = (handler: unknown): unknown => (handler === true ? { fileName: fragmentName } : handler);

    return {
        ...bbData,
        // Always use the derived kebab-case key as the id for aggregation children — the LLM
        // reuses generic values like "custom-filter-field" across calls, causing duplicate ids.
        id: derivedKey,
        ...(generateId && { generateId }),
        // Default to After placement — CustomColumn accesses position unconditionally with a non-null assertion.
        position: bbData['position'] ?? { placement: 'After' },
        // embededFragment: required by CustomColumn/CustomFilterField/CustomFormField
        ...(EMBEDDED_FRAGMENT_TYPES.has(bbType) && {
            embededFragment: {
                ...existingEmbededFragment,
                name: (existingEmbededFragment?.['name'] as string | undefined) ?? fragmentName,
                folder: (existingEmbededFragment?.['folder'] as string | undefined) ?? 'ext/fragment',
                ...(existingEmbededFragment?.['eventHandler'] !== undefined && {
                    eventHandler: resolveHandler(existingEmbededFragment['eventHandler'])
                })
            }
        }),
        // embeddedAction: required by Action
        ...(bbType === BuildingBlockType.Action && {
            embeddedAction: {
                ...existingEmbeddedAction,
                name: (existingEmbeddedAction?.['name'] as string | undefined) ?? fragmentName,
                // Controller files live next to the view (ext/view), standalone handlers next to the fragment (ext/fragment).
                folder:
                    (existingEmbeddedAction?.['folder'] as string | undefined) ??
                    ((
                        (existingEmbeddedAction?.['eventHandler'] as Record<string, unknown> | undefined)?.[
                            'fileName'
                        ] as string | undefined
                    )?.includes('.controller')
                        ? 'ext/view'
                        : 'ext/fragment'),
                ...(existingEmbeddedAction?.['eventHandler'] !== undefined && {
                    eventHandler: resolveHandler(existingEmbeddedAction['eventHandler'])
                })
            }
        })
    };
}
