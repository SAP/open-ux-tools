export interface ProjectSettings {
    fileList?: string[];
}

export interface FileHash {
    filePath: string;
    hash: string;
}

export interface CheckFileHashResult {
    differentFiles: string[];
    equalFiles: string[];
}
