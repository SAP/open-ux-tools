import { ZipFile } from 'yazl';

/**
 * Create a zip file based on the given object.
 *
 * @param zip ZipFile as object
 */
export async function createBuffer(zip: ZipFile): Promise<Buffer> {
    await new Promise<void>((resolve) => {
        zip.end({ forceZip64Format: false }, () => {
            resolve();
        });
    });

    const chunks: Buffer[] = [];
    for await (let chunk of zip.outputStream) {
        chunks.push(chunk as Buffer);
    }

    return Buffer.concat(chunks);
}
