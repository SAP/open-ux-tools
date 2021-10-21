export * from './page';

export interface Ui5Route {
    name: string;
    pattern: string;
    target: string | string[];
}
