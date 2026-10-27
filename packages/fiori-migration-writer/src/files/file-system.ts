import type { Editor } from 'mem-fs-editor';

/**
 * Commits changes from mem-fs-editor to the file system
 *
 * @param fs - The mem-fs-editor instance
 */
export async function commitFileSystemChanges(fs: Editor | undefined): Promise<void> {
    console.log('[DEBUG commitFileSystemChanges] Starting, fs:', !!fs);
    return new Promise((resolve, reject) => {
        if (!fs) {
            console.log('[DEBUG commitFileSystemChanges] No fs provided, resolving immediately');
            resolve();
            return;
        }
        console.log('[DEBUG commitFileSystemChanges] Calling fs.commit()...');
        fs.commit((error) => {
            console.log('[DEBUG commitFileSystemChanges] Commit callback invoked, error:', error);
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
        console.log('[DEBUG commitFileSystemChanges] fs.commit() called, waiting for callback...');
    });
}
