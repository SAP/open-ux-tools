export const wrapInQuotes = (text: string): string => `'${text}'`;

export interface FormatterOptions {
    /**
     * Indent lines with tabs instead of spaces
     *
     * @default false
     */
    useTabs: boolean;
    /**
     * Specify the number of spaces per indentation-level.
     */
    tabWidth: number;
    /**
     * Specify the line length that the printer will wrap on.
     */
    printWidth: number;
    /**
     * @default true
     */
    useSnippetSyntax: boolean;
}

export const printOptions: FormatterOptions = {
    printWidth: 300,
    tabWidth: 4,
    useTabs: false,
    useSnippetSyntax: true
};
