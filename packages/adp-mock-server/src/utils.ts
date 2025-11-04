import { setTimeout } from 'node:timers/promises';
import { DEFAULT_SAP_SYSTEM_PORT, MOCK_DATA_FOLDER_PATH } from './constants';
import { promises as fs } from 'fs';
import { HttpRequestAndHttpResponse } from 'mockserver-client/mockServer';
import { request } from 'node:http';

type CliParamValue = string | number | boolean | undefined;

export async function wait(seconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(seconds * 1000, resolve));
}

export function getSapSystemPort(): number {
    return parseInt(process.env.SAP_SYSTEM_PORT ?? DEFAULT_SAP_SYSTEM_PORT.toString(), 10);
}

export function createMockDataFolderIfNeeded(): Promise<string | undefined> {
    return fs.mkdir(MOCK_DATA_FOLDER_PATH, { recursive: true });
}

export function getCliParamValueByName<T extends CliParamValue>(name: string): T {
    const arg = process.argv.find((arg) => arg.startsWith(`--${name}`));

    if (!arg) {
        return undefined as T;
    }

    const value = arg.split('=')[1];

    if (!value) {
        // If we have param without a value we return true, e.g. --record.
        return true as T;
    }

    if (value.toLowerCase() === 'true') {
        return true as T;
    }

    if (value.toLowerCase() === 'false') {
        return false as T;
    }

    const numericValue = Number(value);
    if (!isNaN(numericValue)) {
        return numericValue as T;
    }

    return value as T;
}
