/**
 * Type declaration for importing `.txt` files as modules.
 *
 * When a `.txt` file is imported, its content is returned as a string.
 */
declare module '*.txt' {
    const content: string;
    export default content;
}
