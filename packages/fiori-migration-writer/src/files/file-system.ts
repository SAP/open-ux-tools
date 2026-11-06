import type { MemFsEditor as Editor } from 'mem-fs-editor';

/**
 * Commits changes from mem-fs-editor to the file system
 *
 * @param fs - The mem-fs-editor instance
 */
export async function commitFileSystemChanges(fs: Editor | undefined): Promise<void> {
    if (!fs) {
        return;
    }
    await fs.commit();
}
