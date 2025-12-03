import type { Disposable } from 'vscode';

/**
 * A generic manager for handling panels within the extension.
 * It allows adding, retrieving, checking existence, creating and deleting panels.
 */
export class PanelManager<T extends Disposable> {
    readonly panels = new Map<string, T>();

    /**
     *
     * @param key
     */
    get(key: string): T | undefined {
        return this.panels.get(key);
    }

    /**
     *
     * @param key
     * @param panel
     */
    set(key: string, panel: T): void {
        this.panels.set(key, panel);
    }

    /**
     *
     * @param key
     */
    has(key: string): boolean {
        return this.panels.has(key);
    }

    /**
     *
     * @param key
     */
    deleteAndDispose(key: string): void {
        const panel = this.panels.get(key);
        if (panel) {
            panel.dispose();
            this.panels.delete(key);
        }
    }

    /**
     *
     * @param key
     * @param factory
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
