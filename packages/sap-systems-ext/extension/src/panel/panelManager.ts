import type { Disposable } from 'vscode';

/**
 * A generic manager for handling panels within the extension.
 * It allows adding, retrieving, checking existence, creating and deleting panels.
 */
export class PanelManager<T extends Disposable> {
    private panels = new Map<string, T>();

    get(key: string): T | undefined {
        return this.panels.get(key);
    }

    set(key: string, panel: T): void {
        this.panels.set(key, panel);
    }

    has(key: string): boolean {
        return this.panels.has(key);
    }

    deleteAndDispose(key: string): void {
        const panel = this.panels.get(key);
        if (panel) {
            panel.dispose();
            this.panels.delete(key);
        }
    }

    getOrCreateNewPanel(key: string, factory: () => T): T {
        let panel = this.get(key);
        if (!panel) {
            panel = factory();
            this.set(key, panel);
        }
        return panel;
    }
}
