export interface App {
    target: string;
    local?: string;
    intent?: {
        object: string;
        action: string;
    };
}

export interface Config {
    flp?: {
        path?: string;
        apps?: App[];
    };
}
