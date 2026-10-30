import type { MemFsEditor } from 'mem-fs-editor';

/**
 * Commits changes from mem-fs-editor to the file system
 *
 * @param fs - The mem-fs-editor instance
 */
export async function commitFileSystemChanges(fs: MemFsEditor | undefined): Promise<void> {
    if (fs) {
        await fs.commit();
    }
}
