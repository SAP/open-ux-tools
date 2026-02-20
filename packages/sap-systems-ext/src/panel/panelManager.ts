import type { Disposable } from 'vscode';

/**
 * A generic manager for handling panels within the extension.
 * It allows adding, retrieving, checking existence, creating and deleting panels.
 */
export class PanelManager<T extends Disposable> {
    readonly panels = new Map<string, T>();

    /**
     * Retrieves a panel by its key.
     *
     * @param key - The unique identifier for the panel
     * @returns The panel associated with the key, or undefined if not found
     */
    get(key: string): T | undefined {
        return this.panels.get(key);
    }

    /**
     * Stores a panel with the specified key.
     *
     * @param key - The unique identifier for the panel
     * @param panel - The panel instance to store
     */
    set(key: string, panel: T): void {
        this.panels.set(key, panel);
    }

    /**
     * Checks whether a panel with the specified key exists.
     *
     * @param key - The unique identifier for the panel
     * @returns True if a panel with the key exists, false otherwise
     */
    has(key: string): boolean {
        return this.panels.has(key);
    }

    /**
     * Deletes a panel by its key and disposes its resources.
     * If the panel exists, it will be disposed and removed from the manager.
     *
     * @param key - The unique identifier for the panel to delete
     */
    deleteAndDispose(key: string): void {
        const panel = this.panels.get(key);
        if (panel) {
            panel.dispose();
            this.panels.delete(key);
        }
    }

    /**
     * Retrieves an existing panel or creates a new one if it doesn't exist.
     * If a panel with the specified key exists, it is returned.
     * Otherwise, a new panel is created using the factory function, stored, and returned.
     *
     * @param key - The unique identifier for the panel
     * @param factory - A factory function that creates a new panel instance
     * @returns The existing or newly created panel
     */
    getOrCreateNewPanel(key: string, factory: () => T): T {
        let panel = this.get(key);
        if (!panel) {
            panel = factory();
            this.set(key, panel);
        }
        return panel;
    }
}
