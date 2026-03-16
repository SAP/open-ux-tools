import { PromptState } from '../src/data-download/prompt-state';

describe('PromptState', () => {
    beforeEach(() => {
        // Ensure clean state before each test
        PromptState.externalServiceRequestCache = {};
        PromptState.entityTypeRefFacetCache = {};
    });

    describe('externalServiceRequestCache', () => {
        it('should be initialized as an empty object', () => {
            expect(PromptState.externalServiceRequestCache).toEqual({});
        });

        it('should allow setting cache entries', () => {
            PromptState.externalServiceRequestCache['/sap/service/path'] = ['EntitySet1', 'EntitySet2'];

            expect(PromptState.externalServiceRequestCache['/sap/service/path']).toEqual(['EntitySet1', 'EntitySet2']);
        });

        it('should persist cache entries across multiple accesses', () => {
            PromptState.externalServiceRequestCache['/service/a'] = ['Entity1'];
            PromptState.externalServiceRequestCache['/service/b'] = ['Entity2', 'Entity3'];

            expect(Object.keys(PromptState.externalServiceRequestCache)).toHaveLength(2);
            expect(PromptState.externalServiceRequestCache['/service/a']).toEqual(['Entity1']);
            expect(PromptState.externalServiceRequestCache['/service/b']).toEqual(['Entity2', 'Entity3']);
        });
    });

    describe('entityTypeRefFacetCache', () => {
        it('should be initialized as an empty object', () => {
            expect(PromptState.entityTypeRefFacetCache).toEqual({});
        });

        it('should allow setting cache entries', () => {
            PromptState.entityTypeRefFacetCache['TravelType'] = ['_Booking', '_Agency'];

            expect(PromptState.entityTypeRefFacetCache['TravelType']).toEqual(['_Booking', '_Agency']);
        });

        it('should persist cache entries across multiple accesses', () => {
            PromptState.entityTypeRefFacetCache['Type1'] = ['path1'];
            PromptState.entityTypeRefFacetCache['Type2'] = ['path2', 'path3'];

            expect(Object.keys(PromptState.entityTypeRefFacetCache)).toHaveLength(2);
            expect(PromptState.entityTypeRefFacetCache['Type1']).toEqual(['path1']);
            expect(PromptState.entityTypeRefFacetCache['Type2']).toEqual(['path2', 'path3']);
        });
    });

    describe('resetExternalServiceCache', () => {
        beforeEach(() => {
            // Set up cache with multiple entries
            PromptState.externalServiceRequestCache = {
                '/service/a': ['Entity1', 'Entity2'],
                '/service/b': ['Entity3'],
                '/service/c': ['Entity4', 'Entity5', 'Entity6']
            };
        });

        it('should reset entire cache when called without arguments', () => {
            PromptState.resetExternalServiceCache();

            expect(PromptState.externalServiceRequestCache).toEqual({});
        });

        it('should remove only specified service path when argument provided', () => {
            PromptState.resetExternalServiceCache('/service/b');

            expect(PromptState.externalServiceRequestCache).toEqual({
                '/service/a': ['Entity1', 'Entity2'],
                '/service/c': ['Entity4', 'Entity5', 'Entity6']
            });

            // If no path specifiec reset all
            PromptState.resetExternalServiceCache();
            expect(PromptState.externalServiceRequestCache).toEqual({});
        });

        it('should not throw when removing non-existent service path', () => {
            expect(() => {
                PromptState.resetExternalServiceCache('/non/existent/path');
            }).not.toThrow();

            // Cache should remain unchanged
            expect(PromptState.externalServiceRequestCache).toEqual({
                '/service/a': ['Entity1', 'Entity2'],
                '/service/b': ['Entity3'],
                '/service/c': ['Entity4', 'Entity5', 'Entity6']
            });
        });

        it('should reset only specific service path', () => {
            PromptState.resetExternalServiceCache('/service/a');

            // Other entries should remain
            expect(PromptState.externalServiceRequestCache['/service/b']).toBeDefined();
            expect(PromptState.externalServiceRequestCache['/service/c']).toBeDefined();
        });
    });

    describe('resetRefFacetCache', () => {
        beforeEach(() => {
            PromptState.entityTypeRefFacetCache = {
                TravelType: ['_Booking'],
                BookingType: ['_Supplement', '_Carrier']
            };
        });

        it('should reset entire ref facet cache', () => {
            PromptState.resetRefFacetCache();

            expect(PromptState.entityTypeRefFacetCache).toEqual({});
        });
    });

    describe('resetServiceCaches', () => {
        beforeEach(() => {
            // Set up both caches with data
            PromptState.externalServiceRequestCache = {
                '/service/a': ['Entity1'],
                '/service/b': ['Entity2', 'Entity3']
            };
            PromptState.entityTypeRefFacetCache = {
                TravelType: ['_Booking'],
                BookingType: ['_Supplement']
            };
        });

        it('should reset both caches', () => {
            PromptState.resetServiceCaches();

            expect(PromptState.externalServiceRequestCache).toEqual({});
            expect(PromptState.entityTypeRefFacetCache).toEqual({});
        });
    });
});
