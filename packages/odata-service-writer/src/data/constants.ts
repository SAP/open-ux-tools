import { ODataVersionMap } from '../types';

export const DEFAULT_DATASOURCE_NAME = 'mainService';

export const toODataVersionKey = (version: string): keyof typeof ODataVersionMap | undefined =>
    Object.entries(ODataVersionMap).find(([, v]) => v === version)?.[0] as keyof typeof ODataVersionMap | undefined;
