import type { GeographyReferences } from './realism-types.js';

/** A CLDR BCP 47 time zone entry: `_alias` lists IANA names, `_description` is `City, Country` or a country. */
export interface TimeZoneEntry {
    _alias?: string;
    _description?: string;
}

/** Sources of the geography references, all external to the generator. */
export interface GeographySources {
    /** CLDR `bcp47/timezone.json` `keyword.u.tz`: zone id (country code + location) to entry. */
    timeZones: Readonly<Record<string, TimeZoneEntry | string>>;
    /** ITU-T E.164 calling code to the regions it serves (libphonenumber `country_calling_codes`). */
    callingCodes: Readonly<Record<string, ReadonlyArray<string>>>;
}

/** CLDR zone ids are a two-letter region code followed by a location code (UN/LOCODE based). */
const ZONE_ID = /^([a-z]{2})[a-z\d]{2,4}$/u;

/**
 * Add a region to the set stored under a key.
 *
 * @param map target map
 * @param key key
 * @param region region code
 */
function addRegion(map: Map<string, Set<string>>, key: string, region: string): void {
    map.set(key, (map.get(key) ?? new Set()).add(region));
}

/**
 * Build the geography references the realism checks compare generated values against, from sources that
 * the generator does not use: CLDR time zones (IANA zone and principal city per region) and E.164 calling
 * codes.
 *
 * @param sources CLDR time zones and calling codes
 * @returns regions, calling codes, city and time zone regions
 * @example
 * const references = buildGeographyReferences({
 *     timeZones: require('cldr-bcp47/bcp47/timezone.json').keyword.u.tz,
 *     callingCodes: require('libphonenumber-js/metadata.min.json').country_calling_codes
 * });
 */
export function buildGeographyReferences(sources: GeographySources): GeographyReferences {
    const regions = new Set<string>();
    const callingCodes = new Map<string, Set<string>>();
    const cityRegions = new Map<string, Set<string>>();
    const zoneRegions = new Map<string, Set<string>>();
    for (const [code, served] of Object.entries(sources.callingCodes)) {
        for (const region of served) {
            regions.add(region);
            addRegion(callingCodes, code, region);
        }
    }
    for (const [id, entry] of Object.entries(sources.timeZones)) {
        const region = ZONE_ID.exec(id)?.[1]?.toUpperCase();
        if (!region || typeof entry !== 'object') {
            continue;
        }
        regions.add(region);
        for (const zone of entry._alias?.split(/\s+/u).filter(Boolean) ?? []) {
            addRegion(zoneRegions, zone, region);
        }
        const city = entry._description?.includes(',') ? entry._description.split(',')[0].trim() : undefined;
        if (city) {
            addRegion(cityRegions, city.toLowerCase(), region);
        }
    }
    return { regions, callingCodes, cityRegions, zoneRegions };
}
