export interface UrlAbapTarget {
    url: string;
    client?: string;
    scp?: boolean;
}

export interface DestinationAbapTarget {
    destination: string;
}

export type AbapTarget =
    | (UrlAbapTarget & Partial<DestinationAbapTarget>)
    | (DestinationAbapTarget & Partial<UrlAbapTarget>);
