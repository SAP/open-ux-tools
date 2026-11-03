import {
    translateBuildingBlockInput,
    resolveAggregationChildDefaults
} from '../../../../../src/tools/functionalities/building-block/translate.js';

describe('translateBuildingBlockInput', () => {
    test('CustomColumn: header → title, key → columnKey, anchor/placement → position', () => {
        const result = translateBuildingBlockInput({
            buildingBlockType: 'custom-column',
            header: 'My Rating',
            key: 'my-rating',
            anchor: 'price',
            placement: 'Before'
        });
        expect(result['title']).toBe('My Rating');
        expect(result['columnKey']).toBe('my-rating');
        expect(result['position']).toEqual({ anchor: 'price', placement: 'Before' });
        expect(result['header']).toBeUndefined();
        expect(result['anchor']).toBeUndefined();
    });

    test('Action: press → embeddedAction.eventHandler, key → actionKey (anchor/placement stay flat)', () => {
        const result = translateBuildingBlockInput({
            buildingBlockType: 'action',
            key: 'approve',
            press: 'handler.onApprove',
            anchor: 'reject',
            placement: 'After'
        });
        expect(result['actionKey']).toBe('approve');
        expect(result['embeddedAction']).toEqual({ eventHandler: 'handler.onApprove' });
        expect(result['press']).toBeUndefined();
        // Action keeps anchor/placement flat — must NOT be wrapped into position.
        expect(result['position']).toBeUndefined();
        expect(result['anchor']).toBe('reject');
    });

    test('RichTextEditor: targetProperty is copied into metaPath when metaPath is absent', () => {
        const result = translateBuildingBlockInput({
            buildingBlockType: 'rich-text-editor',
            targetProperty: '/Products/description'
        });
        expect(result['metaPath']).toBe('/Products/description');
        // targetProperty is preserved, not deleted.
        expect(result['targetProperty']).toBe('/Products/description');
    });

    test('RichTextEditor: an explicit metaPath is not overwritten', () => {
        const result = translateBuildingBlockInput({
            buildingBlockType: 'rich-text-editor',
            targetProperty: '/Products/description',
            metaPath: '/Products/notes'
        });
        expect(result['metaPath']).toBe('/Products/notes');
    });
});

describe('resolveAggregationChildDefaults', () => {
    test('standalone type is passed through with the supplied id', () => {
        const result = resolveAggregationChildDefaults({ buildingBlockType: 'table' }, 'table');
        expect(result).toEqual({ buildingBlockType: 'table', id: 'table' });
    });

    test('CustomColumn derives a kebab id, embededFragment and a default position', () => {
        const result = resolveAggregationChildDefaults(
            { buildingBlockType: 'custom-column', title: 'My Rating', columnKey: 'my-rating' },
            'custom-column'
        );
        expect(result['id']).toBe('my-rating');
        expect(result['position']).toEqual({ placement: 'After' });
        expect(result['embededFragment']).toMatchObject({ name: 'my-rating', folder: 'ext/fragment' });
    });

    test('eventHandler: true is expanded into { fileName }', () => {
        const result = resolveAggregationChildDefaults(
            {
                buildingBlockType: 'custom-column',
                title: 'Rating',
                columnKey: 'rating',
                embededFragment: { eventHandler: true }
            },
            'custom-column'
        );
        expect((result['embededFragment'] as any).eventHandler).toEqual({ fileName: 'rating' });
    });
});
