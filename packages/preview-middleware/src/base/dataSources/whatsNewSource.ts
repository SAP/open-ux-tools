import type { Logger } from '@sap-ux/logger';
import type { NewsItem } from '../utils/newsAdapter';
import path from 'node:path';

const SAP_WHATSNEW_URL = 'https://help.sap.com/http.svc/whatsnew';
const FIORI_TOOLS_LOIO = 'd29596a7d7b040d88a20a73dee29a1ec';
const DEFAULT_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const REQUEST_TIMEOUT_MS = 10_000; // 10 seconds

/**
 * A single column filter in the SAP What's New API request.
 */
interface WhatsNewColumn {
    name: string;
    query?: string[];
    tableSearch?: number;
    unscheduledItems?: boolean;
    dateFrom?: string;
    dateTo?: string;
}

/**
 * Sort specification for the SAP What's New API request.
 */
interface WhatsNewSort {
    name: string;
    direction: 'ASC' | 'DESC';
}

/**
 * Full request body for POST /http.svc/whatsnew.
 */
interface WhatsNewRequest {
    from: number;
    size: number;
    state: string;
    columns: WhatsNewColumn[];
    sort: WhatsNewSort[];
    locale: string;
}

/**
 * A single result item from the SAP What's New API response.
 */
interface WhatsNewResult {
    id: number;
    'deliverable.version': string;
    Description: string;
    outputloio: string;
    Title: string;
    Valid_as_Of: string;
    Type: string[];
    Category: string[];
    Version: string[];
}

/**
 * The data payload within the SAP What's New API response.
 */
interface WhatsNewData {
    results: WhatsNewResult[];
    start: number;
    length: number;
    total: number;
}

/**
 * Top-level SAP What's New API response structure.
 */
interface WhatsNewResponse {
    status: string;
    data: WhatsNewData;
}

/**
 * In-memory cache entry for fetched news items.
 */
interface CacheEntry {
    items: NewsItem[];
    timestamp: number;
}

/**
 * Fetches and maps SAP Fiori Tools "What's New" entries from the SAP Help Portal
 * into NewsItem objects for display on the enhanced FLP homepage.
 *
 * Groups all changes from the latest tool version into a single news feed
 * with individual changes as articles.
 */
export class WhatsNewSource {
    private readonly logger: Logger;
    private readonly cacheTtlMs: number;
    private cache: CacheEntry | null = null;

    /**
     * Creates a new WhatsNewSource instance.
     *
     * @param logger logger instance for debug output
     * @param cacheTtlMs time-to-live for the in-memory cache in milliseconds (default: 30 minutes)
     */
    constructor(logger: Logger, cacheTtlMs: number = DEFAULT_CACHE_TTL_MS) {
        this.logger = logger;
        this.cacheTtlMs = cacheTtlMs;
    }

    /**
     * Fetches news items from the SAP What's New API.
     * Returns cached data if still fresh, otherwise calls the API.
     * On failure, returns stale cache if available, otherwise an empty array.
     *
     * @returns array of news items for the enhanced FLP homepage
     */
    async fetchNews(): Promise<NewsItem[]> {
        if (this.cache && Date.now() - this.cache.timestamp < this.cacheTtlMs) {
            this.logger.debug("Returning cached SAP What's New data");
            return this.cache.items;
        }

        try {
            const response = await this.callApi();
            const items = this.mapToNewsItems(response.data.results);
            this.cache = { items, timestamp: Date.now() };
            return items;
        } catch (error) {
            this.logger.debug(`Failed to fetch SAP What's New: ${error}`);
            return this.cache?.items ?? [];
        }
    }

    /**
     * Calls the SAP What's New API with a POST request.
     *
     * @returns the parsed API response
     */
    private async callApi(): Promise<WhatsNewResponse> {
        const response = await fetch(SAP_WHATSNEW_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(WhatsNewSource.buildRequestBody()),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
        });

        if (!response.ok) {
            throw new Error(`SAP What's New API returned ${response.status}: ${response.statusText}`);
        }

        const data = (await response.json()) as WhatsNewResponse;
        if (data.status !== 'OK') {
            throw new Error(`SAP What's New API returned status: ${data.status}`);
        }

        return data;
    }

    /**
     * Maps API results to NewsItem objects.
     * Filters to the latest version, groups changes by category, and returns
     * a single news item with all categories rendered as an HTML document.
     *
     * @param results the raw API result items
     * @returns array of news items (single item with full HTML description)
     */
    private mapToNewsItems(results: WhatsNewResult[]): NewsItem[] {
        const latestVersion = WhatsNewSource.determineLatestVersion(results);
        if (!latestVersion) {
            return [];
        }

        const latestResults = results.filter((r) => r.Version.includes(latestVersion));
        if (latestResults.length === 0) {
            return [];
        }

        // Group results by category
        const byCategory = new Map<string, WhatsNewResult[]>();
        for (const result of latestResults) {
            const category = result.Category[0] ?? 'Other';
            const existing = byCategory.get(category) ?? [];
            existing.push(result);
            byCategory.set(category, existing);
        }

        // Build a single HTML description with intro + all categories
        const intro =
            `Learn about changes and new features that are available for SAP Fiori tools ${latestVersion}. ` +
            'To use all new features, ensure your extensions are up to date. ' +
            'You can always update your extensions in your preferred Integrated Development Environment (IDE).';

        const categorySections = [...byCategory.entries()]
            .map(([category, items]) => {
                const listItems = items
                    .map((item) => `<li>${WhatsNewSource.stripHtml(item.Description)}</li>`)
                    .join('');
                return `<h3>${category}</h3><ul>${listItems}</ul>`;
            })
            .join('<hr>');

        const description = `<p>${intro}</p>${categorySections}`;

        return [
            {
                title: "What's New for SAP Fiori Tools",
                subTitle:
                    'Learn about features that have been added and changes that have been made to SAP Fiori tools.',
                description,
                footerText: `SAP Fiori Tools ${latestVersion}`,
                image: path.join(__dirname, '../images/whats-new.jpg')
            },
            {
                title: 'SAP Fiori Tools',
                subTitle: 'Simplify SAP Fiori development with SAP Fiori tools.',
                description:
                    '<p>SAP Fiori tools is a set of extensions for SAP Business Application Studio and Visual Studio Code' +
                    ' that makes developing SAP Fiori applications faster and easier.' +
                    ' If you want to learn more about SAP Fiori tools, visit ' +
                    '<a href="http://sapfioritools.com" target="_blank">sapfioritools.com</a>.</p>',
                footerText: 'SAP Fiori Tools',
                image: path.join(__dirname, '../images/fiori-tools.jpg')
            },
            {
                title: 'SAP Fiori Elements',
                subTitle: 'Build SAP Fiori apps using SAP Fiori elements.',
                description:
                    '<p>SAP Fiori elements provides predefined templates and building blocks for creating SAP Fiori applications.' +
                    ' If you want to learn more about SAP Fiori elements, visit ' +
                    '<a href="http://www.sapfiorielements.com" target="_blank">sapfiorielements.com</a>.</p>',
                footerText: 'SAP Fiori Elements',
                image: path.join(__dirname, '../images/fiori-elements.jpg')
            }
        ];
    }

    /**
     * Determines the highest semantic version from all result items.
     *
     * @param results the API result items
     * @returns the latest version string, or undefined if no versions found
     */
    private static determineLatestVersion(results: WhatsNewResult[]): string | undefined {
        const versions = new Set<string>();
        for (const result of results) {
            for (const v of result.Version) {
                versions.add(v);
            }
        }

        if (versions.size === 0) {
            return undefined;
        }

        const sorted = [...versions].sort((a, b) => {
            const pa = a.split('.').map(Number);
            const pb = b.split('.').map(Number);
            for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
                const diff = (pb[i] ?? 0) - (pa[i] ?? 0);
                if (diff !== 0) {
                    return diff;
                }
            }
            return 0;
        });

        return sorted[0];
    }

    /**
     * Strips HTML tags and decodes common HTML entities from a string.
     *
     * @param html the string potentially containing HTML markup
     * @returns the plain text string
     */
    static stripHtml(html: string): string {
        return html
            .replace(/<[^>]*>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Builds the trimmed POST request body for the SAP What's New API.
     *
     * @returns the request body object
     */
    private static buildRequestBody(): WhatsNewRequest {
        return {
            from: 0,
            size: 100,
            state: 'PRODUCTION',
            columns: [
                { name: 'Type', query: [] },
                { name: 'Category', query: [] },
                { name: 'Title', query: [] },
                { name: 'Description', query: [] },
                { name: 'Version', query: [] },
                {
                    name: 'Valid_as_Of',
                    tableSearch: 0,
                    unscheduledItems: false,
                    dateFrom: '',
                    dateTo: ''
                },
                {
                    name: 'outputloio',
                    tableSearch: 0,
                    query: [FIORI_TOOLS_LOIO]
                },
                {
                    name: 'deliverable.version',
                    tableSearch: 0,
                    query: []
                }
            ],
            sort: [
                { name: 'Valid_as_Of', direction: 'DESC' },
                { name: 'Type', direction: 'DESC' },
                { name: 'Category', direction: 'ASC' }
            ],
            locale: 'en-US'
        };
    }
}
