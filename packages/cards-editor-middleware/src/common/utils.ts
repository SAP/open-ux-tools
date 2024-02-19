import { statSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { CARD_TYPES } from './constants';
const { version } = require('../../package.json');
// dont use: import { version } from '../../package.json'; as it creates 'src' in dist which causes the npm package to be empty.

interface MultiCardsPayload {
    type: string;
    manifest: object;
}

interface MultiCardsStringManifest {
    integration: string;
    adaptive: string;
}

/**
 * 
 * @param path {string} 
 * @returns {string} returns the file name
 */
export function prepareFileName(path: string) {
    const fileName = path.split('/')[path.split('/').length - 1];
    return fileName.endsWith('.json') ? fileName : `${fileName}.json`;
}

export function prepareCardForSaving(card: any): string {
    const cardContent = card?.['sap.card']?.['content'];
    if (['stacked_column', 'vertical_bullet'].includes(cardContent?.chartType)) {
        const oldChartProperties = cardContent.chartProperties;
        cardContent.chartProperties.valueAxis.label.formatString =
            oldChartProperties.valueAxis.label.formatString || '';
        cardContent.chartProperties.valueAxis.label.unitFormatType =
            oldChartProperties.valueAxis.label.unitFormatType || '';
    }
    const insights = card?.['sap.insights'];
    if (!insights.versions) {
        insights.versions = {
            dtMiddleware: version
        };
    } else {
        insights.versions.dtMiddleware = version;
    }
    return JSON.stringify(card, null, 2);
}

export function prepareCardTypesForSaving(aMultipleCards: MultiCardsPayload[]): MultiCardsStringManifest {
    const integrationCard:any = aMultipleCards.find(card => card.type === CARD_TYPES.INTERGATION) || {};
    const adaptiveCard:any = aMultipleCards.find(card => card.type === CARD_TYPES.ADAPTIVE) || {};
    return {
        integration: JSON.stringify(integrationCard.manifest, null, 2),
        adaptive: JSON.stringify(adaptiveCard.manifest, null, 2)
    };
}

export function getAllManifests(folder: string) {
    return readdirSync(folder)
        .filter(function (file: string) {
            return statSync(join(folder, file)).isFile();
        })
        .map(function (file: string) {
            let manifest: object = {};
            try {
                manifest = JSON.parse(readFileSync(join(folder, file), 'utf8'));
            } catch (err) {
                if (err instanceof SyntaxError) {
                    manifest = {
                        _error: err.message
                    };
                }
            }
            return {
                file: folder + '/' + file.replace('.json', ''),
                manifest: manifest
            };
        });
}

export function traverseI18nProperties(path: string, fnCallback: any): string[] {
    const i18nFile: string = readFileSync(path, 'utf8');
    const lines = i18nFile.split(/\r\n|\n/);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.startsWith('#')) {
            const [key, value] = line.includes('=') ? line.split('=') : line.split(':');
            fnCallback(line, i, key ? key.trim() : key, value ? value.trim() : value);
        } else {
            fnCallback(line, i);
        }
    }
    return lines;
}

const flatten = (lists: any) => {
    return lists.reduce((a: any, b: string) => a.concat(b), []);
};

const getDirectories = (srcpath: any) => {
    return readdirSync(srcpath)
        .map((file) => join(srcpath, file))
        .filter((path) => statSync(path).isDirectory());
};

export const getDirectoriesRecursive = (srcpath: any): any[] => {
    return [srcpath, ...flatten(getDirectories(srcpath).map(getDirectoriesRecursive))];
};
