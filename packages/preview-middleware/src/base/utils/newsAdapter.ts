/* eslint-disable camelcase */
import { readFileSync, existsSync } from 'node:fs';
import { basename } from 'node:path';

/**
 * Human-readable news item to be displayed on the enhanced FLP homepage.
 */
export interface NewsItem {
    title: string;
    subTitle?: string;
    description?: string;
    footerText?: string;
    image?: string;
}

/**
 * Internal OData article representation used by the FLP homepage news service.
 */
interface ODataArticle {
    bg_image_id: string | null;
    title: string;
    subTitle?: string;
    description?: string;
}

/**
 * Internal OData image representation linked to a news group.
 */
interface ODataNewsImage {
    image_id: string;
    file_name: string;
    mime_type: string;
    bg_image: string | null;
}

/**
 * Internal OData news group representation used by the FLP homepage news service.
 */
interface ODataNewsGroup {
    group_id: string;
    bg_image_id: string | null;
    title: string;
    description: string;
    footer_text: string;
    _group_to_article: ODataArticle[];
    _group_to_image: ODataNewsImage | null;
}

/**
 * Full OData response structure for the FLP homepage news endpoint.
 */
export interface ODataNewsResponse {
    value: ODataNewsGroup[];
}

/**
 * Adapter for managing news items displayed on the enhanced FLP homepage.
 * Provides a simple API for setting news items and converting them
 * to the OData format expected by the FLP news service.
 */
export class NewsAdapter {
    private items: NewsItem[] = [];
    private nextImageId = 1;

    /**
     * Replaces the current news items with the provided array.
     *
     * @param items array of news items to display
     */
    setNewsItems(items: NewsItem[]): void {
        this.items = [...items];
    }

    /**
     * Returns the current collection of news items.
     *
     * @returns array of news items
     */
    getNewsItems(): ReadonlyArray<NewsItem> {
        return this.items;
    }

    /**
     * Returns the news items in the OData response format expected by the FLP homepage.
     *
     * @returns formatted OData news response
     */
    async getNewsResponse(): Promise<ODataNewsResponse> {
        const items = this.getNewsItems();
        const mappedItems = await Promise.all(items.map((item, index) => this.mapNewsItem(item, index)));

        return {
            value: mappedItems
        };
    }

    /**
     * Maps a human-readable NewsItem to the OData news group format.
     *
     * @param item the news item
     * @param index the index of the item in the list
     * @returns OData news group object
     */
    private async mapNewsItem(item: NewsItem, index: number): Promise<ODataNewsGroup> {
        const groupId = `Transient_Group_${index + 1}`;
        const imageData = await this.resolveImage(item.image);

        return {
            group_id: groupId,
            title: item.title,
            description: item.subTitle ?? '',
            footer_text: item.footerText ?? '',
            bg_image_id: imageData?.image_id ?? null,
            _group_to_article: [
                {
                    bg_image_id: imageData?.image_id ?? null,
                    title: item.title,
                    subTitle: item.subTitle ?? '',
                    description: item.description ?? ''
                }
            ],
            _group_to_image: imageData
        };
    }

    /**
     * Resolves an image from a local file path or remote URL, base64-encodes it,
     * and returns the OData image object.
     * Returns null if no path is provided or the resource cannot be resolved.
     *
     * @param imagePath optional local file path or remote URL to the image
     * @returns OData image object or null
     */
    private async resolveImage(imagePath?: string): Promise<ODataNewsImage | null> {
        if (!imagePath) {
            return null;
        }

        try {
            const isRemote = imagePath.startsWith('http://') || imagePath.startsWith('https://');
            let buffer: Buffer;
            let fileName: string;
            let mimeType: string;

            if (isRemote) {
                const response = await fetch(imagePath);
                if (!response.ok) {
                    return null;
                }
                fileName = basename(new URL(imagePath).pathname) || 'image';
                mimeType = response.headers.get('content-type')?.split(';')[0].trim() ?? 'application/octet-stream';
                buffer = Buffer.from(await response.arrayBuffer());
            } else {
                if (!existsSync(imagePath)) {
                    return null;
                }
                fileName = basename(imagePath);
                mimeType = NewsAdapter.getMimeType(fileName);
                buffer = readFileSync(imagePath);
            }

            const imageId = `${this.nextImageId++}`;
            return {
                image_id: imageId,
                file_name: fileName,
                mime_type: mimeType,
                bg_image: buffer.toString('base64')
            };
        } catch {
            return null;
        }
    }

    /**
     * Derives a MIME type from a file name based on its extension.
     *
     * @param fileName the file name to derive the MIME type from
     * @returns the MIME type string
     */
    private static getMimeType(fileName: string): string {
        const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
        if (ext === 'jpg' || ext === 'jpeg') {
            return 'image/jpeg';
        }
        if (ext === 'svg') {
            return 'image/svg+xml';
        }
        return ext ? `image/${ext}` : 'application/octet-stream';
    }
}
