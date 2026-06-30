import type { Logger } from '@sap-ux/logger';
import type { NewsItem } from '../utils/newsAdapter.js';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SAP_WHATSNEW_URL = 'https://help.sap.com/http.svc/whatsnew';
const DEFAULT_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const REQUEST_TIMEOUT_MS = 10_000; // 10 seconds

/**
 * Configuration for a single SAP What's New feed (e.g. Fiori Tools, Fiori Elements).
 */
export interface WhatsNewSourceConfig {
    /** Short product label, used in the news title and footer (e.g. "SAP Fiori Tools"). */
    productLabel: string;
    /** Icon for the news title. */
    titleIcon?: string;
    /** LOIO of the product's What's New page on the SAP Help Portal. */
    loio: string;
    /** Optional Category filter applied server-side (e.g. ["SAP Fiori Elements"]). */
    categoryFilter?: string[];
    /** URL of the product documentation; used to embed a link in the introduction. */
    docsUrl: string;
    /**
     * Trailing sentence appended to the introduction, telling the user what to upgrade
     * to pick up the new features (e.g. "ensure your Fiori tools extensions and packages
     * are up to date."). Wording differs per product.
     */
    upgradeHint: string;
    /** Absolute path to the image used as the news header. */
    imagePath: string;
    /**
     * Which API field drives the top-level grouping (the package heading inside the
     * dialog). `'category'` uses `result.Category[0]` — appropriate when the API
     * returns multiple Categories per LOIO (e.g. Fiori Tools: Application Modeler,
     * Adaptation Project, Service Modeler). `'title'` uses `result.Title` — appropriate
     * when every row shares one Category and the Title carries the real package
     * boundary (e.g. Fiori Elements: "SAP Fiori Elements for OData V4").
     */
    groupBy: 'category' | 'title';
    /**
     * Optional normaliser for the group key extracted via `groupBy`. Lets us shorten
     * verbose API titles (e.g. "SAP Fiori Elements for OData V4" → "OData V4") so the
     * heading stays compact and reads as a sub-package within the product.
     */
    groupLabel?: (rawKey: string) => string;
    /**
     * When true, the lead-in prose that precedes a result's inner `<ul>` is dropped
     * (e.g. "The following changes and new features are available for SAP Fiori
     * Elements for OData V4:"). Useful when the lead-in is redundant with the group
     * heading we already render above the bullets. Default: false.
     */
    dropDescriptionLeadIn?: boolean;
}

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
 * Default configuration for the SAP Fiori Tools What's New feed.
 */
export const FIORI_TOOLS_WHATSNEW_CONFIG: WhatsNewSourceConfig = {
    productLabel: 'SAP Fiori Tools',
    titleIcon: '',
    loio: 'd29596a7d7b040d88a20a73dee29a1ec',
    docsUrl: 'https://help.sap.com/docs/SAP_FIORI_tools',
    upgradeHint: 'To use all new features, ensure your Fiori tools extensions and packages are up to date.',
    imagePath: path.join(__dirname, '../images/whats-new.jpg'),
    groupBy: 'category'
};

/**
 * Default configuration for the SAP Fiori Elements What's New feed.
 */
export const FIORI_ELEMENTS_WHATSNEW_CONFIG: WhatsNewSourceConfig = {
    productLabel: 'SAP Fiori Elements',
    loio: '40dc77b604f54b21a2faadc7860dc5d7',
    categoryFilter: ['SAP Fiori Elements'],
    docsUrl: 'https://help.sap.com/docs/SAP_FIORI_ELEMENTS',
    upgradeHint: 'To use all new features, ensure that your UI5 version is up to date.',
    imagePath: path.join(__dirname, '../images/whats-new-fe.jpg'),
    groupBy: 'title',
    // Map "SAP Fiori Elements for OData V4" → "OData V4". Anything else falls through unchanged.
    groupLabel: (raw: string) => {
        const match = /OData\s*V\s*([0-9]+)/i.exec(raw);
        return match ? `OData V${match[1]}` : raw;
    },
    dropDescriptionLeadIn: true
};

/**
 * Fetches and maps SAP "What's New" entries from the SAP Help Portal
 * into NewsItem objects for display on the enhanced FLP homepage.
 *
 * Groups all changes from the latest product version into a single news feed
 * with categories rendered as sections and types ("New" / "Changed") as subsections.
 */
export class WhatsNewSource {
    private readonly logger: Logger;
    private readonly cacheTtlMs: number;
    private readonly config: WhatsNewSourceConfig;
    private cache: CacheEntry | null = null;

    /**
     * Creates a new WhatsNewSource instance.
     *
     * @param logger logger instance for debug output
     * @param config feed configuration (product label, LOIO, optional category filter, docs URL, image)
     * @param cacheTtlMs time-to-live for the in-memory cache in milliseconds (default: 30 minutes)
     */
    constructor(logger: Logger, config: WhatsNewSourceConfig, cacheTtlMs: number = DEFAULT_CACHE_TTL_MS) {
        this.logger = logger;
        this.config = config;
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
            this.logger.debug(`Returning cached SAP What's New data for ${this.config.productLabel}`);
            return this.cache.items;
        }

        try {
            const response = await this.callApi();
            const items = this.mapToNewsItems(response.data.results);
            this.cache = { items, timestamp: Date.now() };
            return items;
        } catch (error) {
            this.logger.debug(`Failed to fetch SAP What's New for ${this.config.productLabel}: ${error}`);
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
            body: JSON.stringify(this.buildRequestBody()),
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

        // Group results by the configured key (Category for Fiori Tools, Title for
        // Fiori Elements), then by type ("New" / "Changed") inside each group.
        const byGroup = new Map<string, Map<string, WhatsNewResult[]>>();
        for (const result of latestResults) {
            const rawKey = this.config.groupBy === 'title' ? result.Title : result.Category[0];
            const normalised = rawKey ?? 'Other';
            const groupKey = this.config.groupLabel ? this.config.groupLabel(normalised) : normalised;
            const type = WhatsNewSource.getTypeLabel(result.Type[0] ?? 'Other');
            const typeMap = byGroup.get(groupKey) ?? new Map<string, WhatsNewResult[]>();
            const existing = typeMap.get(type) ?? [];
            existing.push(result);
            typeMap.set(type, existing);
            byGroup.set(groupKey, typeMap);
        }

        const groupEntries = [...byGroup.entries()];
        // Suppress the per-group <h2> when there's only one group AND its label just
        // restates the product name (e.g. Fiori Elements feed before any OData split).
        // In every other case (Fiori Tools' multi-category, Fiori Elements' OData V2/V4),
        // the heading is the analogue of "Application Modeler"/"Adaptation Project".
        const suppressHeading = groupEntries.length === 1 && this.config.productLabel.includes(groupEntries[0][0]);

        const groupSections = groupEntries
            .map(([groupName, typeMap]) => {
                const heading = suppressHeading ? '' : `<h2>${groupName}</h2>`;
                const typeSections = [...typeMap.entries()]
                    .sort(([a], [b]) => WhatsNewSource.compareTypes(a, b))
                    .map(([type, items]) => {
                        const listItems = items
                            .flatMap((item) =>
                                WhatsNewSource.descriptionToListItems(item, this.config.dropDescriptionLeadIn)
                            )
                            .join('');
                        return `<h3>${type}</h3><ul>${listItems}</ul>`;
                    })
                    .join('');
                return `${heading}${typeSections}`;
            })
            .join('<hr>');

        const description = `<p>${this.getNewsIntroduction(latestVersion, true)}</p>${groupSections}`;
        const title = this.config.titleIcon
            ? `${this.config.titleIcon} What's New for ${this.config.productLabel}`
            : `What's New for ${this.config.productLabel}`;

        return [
            {
                title,
                subTitle: this.getNewsIntroduction(latestVersion, false),
                description,
                footerText: `${this.config.productLabel} ${latestVersion}`,
                image: this.config.imagePath
            }
        ];
    }

    /**
     * Generates a news introduction message for the given version.
     *
     * @param latestVersion the latest version string
     * @param embedLink whether to embed the product as an HTML link
     * @returns the introduction text
     */
    private getNewsIntroduction(latestVersion: string, embedLink: boolean): string {
        const embeddedLabel = embedLink
            ? `<a href="${this.config.docsUrl}" target="_blank">${this.config.productLabel}</a>`
            : this.config.productLabel;
        return (
            `Learn about changes and new features that are available for ${embeddedLabel} ${latestVersion}. ` +
            this.config.upgradeHint
        );
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
     * Comparator that orders type labels with "New" first, then "Changed",
     * with all other labels following alphabetically.
     *
     * @param a first type label
     * @param b second type label
     * @returns negative, zero, or positive per Array.prototype.sort
     */
    private static compareTypes(a: string, b: string): number {
        const order = ['New', 'Changed'];
        const ai = order.indexOf(a);
        const bi = order.indexOf(b);
        if (ai !== -1 || bi !== -1) {
            return (ai === -1 ? order.length : ai) - (bi === -1 ? order.length : bi);
        }
        return a.localeCompare(b);
    }

    /**
     * Maps API type labels to the section labels shown in the news detail dialog.
     *
     * @param type raw type label from the SAP What's New API
     * @returns display label for the news type section
     */
    private static getTypeLabel(type: string): string {
        if (type === 'Added') {
            return 'New';
        }
        if (type === 'Fixed') {
            return 'Changed';
        }
        return type;
    }

    /**
     * Converts a single API result's `Description` into one or more `<li>` strings
     * that match the bullet structure shown on the SAP help portal.
     *
     * The portal renders each `<li>` from the API description as its own visual
     * bullet, optionally led by any prose that precedes the inner `<ul>`. We
     * mirror that here: every inner `<li>` becomes a separate top-level bullet,
     * falling back to a single bullet when there is no inner list.
     *
     * When `dropLeadIn` is true, the prose preceding the inner `<ul>` (e.g. "The
     * following changes and new features are available for SAP Fiori Elements for
     * OData V4:") is discarded — useful when the parent group heading already
     * conveys that context.
     *
     * @param item the raw API result item
     * @param dropLeadIn when true, omit the prose that precedes the inner `<ul>`
     * @returns an array of fully-sanitised `<li>...</li>` strings (already escaped)
     */
    private static descriptionToListItems(item: WhatsNewResult, dropLeadIn = false): string[] {
        const description = item.Description ?? '';
        const ulMatch = /<ul\b[^>]*>([\s\S]*?)<\/ul>/i.exec(description);

        if (!ulMatch) {
            const sanitised = WhatsNewSource.sanitizeDescription(description);
            return sanitised ? [`<li>${sanitised}</li>`] : [];
        }

        const lead = dropLeadIn ? '' : WhatsNewSource.sanitizeDescription(description.slice(0, ulMatch.index));
        const bullets = [...ulMatch[1].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
            .map((m) => WhatsNewSource.sanitizeDescription(m[1]))
            .filter((text) => text.length > 0);

        if (bullets.length === 0) {
            return lead ? [`<li>${lead}</li>`] : [];
        }

        // Merge the lead-in prose (e.g. "The following changes are available for…")
        // into the first bullet so the layout matches the help portal one-for-one.
        const firstBullet = lead ? `${lead} ${bullets[0]}` : bullets[0];
        return [firstBullet, ...bullets.slice(1)].map((text) => `<li>${text}</li>`);
    }

    /**
     * Sanitises a What's New description for safe rendering inside UI5's FormattedText.
     *
     * Keeps inline formatting and links the SAP help portal renders (anchors, code,
     * strong/em/b/i, br) and drops anything else (block tags, scripts, styles, images).
     * Anchors are normalised to open in a new tab with `rel="noopener noreferrer"`,
     * and `javascript:` / `data:` URLs are stripped to defeat injection.
     *
     * @param html the raw description string from the API
     * @returns a sanitised HTML fragment suitable for FormattedText
     */
    static sanitizeDescription(html: string): string {
        const allowedTags = new Set(['a', 'code', 'strong', 'em', 'b', 'i', 'br']);

        // Drop <script>/<style> and their bodies entirely
        let cleaned = html
            .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');

        // Walk every tag and keep only the whitelist; rebuild <a> with safe attrs
        cleaned = cleaned.replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (_match, slash, tagName, attrs) => {
            const tag = tagName.toLowerCase();
            if (!allowedTags.has(tag)) {
                return '';
            }
            if (slash) {
                return `</${tag}>`;
            }
            if (tag === 'a') {
                const hrefMatch = /\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
                const rawHref = hrefMatch ? (hrefMatch[2] ?? hrefMatch[3] ?? hrefMatch[4] ?? '') : '';
                const href = WhatsNewSource.isSafeUrl(rawHref) ? rawHref : '';
                return href
                    ? `<a href="${WhatsNewSource.escapeAttr(href)}" target="_blank" rel="noopener noreferrer">`
                    : '<a>';
            }
            if (tag === 'br') {
                return '<br>';
            }
            return `<${tag}>`;
        });

        // Collapse runs of whitespace introduced by tag stripping
        return cleaned.replace(/\s+/g, ' ').trim();
    }

    /**
     * Returns true for HTTP(S), mailto, and protocol-relative URLs; false for
     * `javascript:` / `data:` / `vbscript:` and other unsafe schemes.
     *
     * @param url the URL to test
     * @returns whether the URL is safe to embed in an anchor
     */
    private static isSafeUrl(url: string): boolean {
        const trimmed = url.trim();
        if (!trimmed) {
            return false;
        }
        if (/^(https?:|mailto:|\/\/|\/|#)/i.test(trimmed)) {
            return true;
        }
        return /^[a-zA-Z0-9._\-?&=%]+$/.test(trimmed);
    }

    /**
     * Escapes the characters that would break out of an HTML double-quoted attribute.
     *
     * @param value the attribute value to escape
     * @returns the escaped attribute value
     */
    private static escapeAttr(value: string): string {
        return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    /**
     * Builds the trimmed POST request body for the SAP What's New API.
     *
     * @returns the request body object
     */
    private buildRequestBody(): WhatsNewRequest {
        return {
            from: 0,
            size: 100,
            state: 'PRODUCTION',
            columns: [
                { name: 'Type', query: [] },
                { name: 'Category', query: this.config.categoryFilter ?? [] },
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
                    query: [this.config.loio]
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
