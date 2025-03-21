export interface SecureStore {
    /** Save a value in the secure store. Can overwrite previous values
     *
     * Returns `true` if successful, `false` if not
     */
    save<T>(service: string, key: string, value: T): Promise<boolean>;

    /** Retrieves a previous stored key. Returns undefined if not found */
    retrieve<T>(service: string, key: string): Promise<T | undefined>;

    /** Delete a previously stored key.
     *
     * Returns `true` if successful, `false` if not
     * */
    delete(service: string, key: string): Promise<boolean>;

    /** Get all the values stored for the service
     *
     * @param service
     */
    getAll<T>(service: string): Promise<{ [key: string]: T }>;
}
