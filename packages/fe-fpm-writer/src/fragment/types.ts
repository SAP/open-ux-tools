/**
 * Fragment generation configuration.
 */
export interface Fragment {
    /**
     * Fragment name (without .fragment.xml extension).
     */
    name: string;
    /**
     * Optional folder path relative to webapp directory. Defaults to 'ext/fragment'.
     */
    folder?: string;
    /**
     * Optional XML content for the fragment. If not provided, a default fragment will be generated.
     */
    content?: string;
}
