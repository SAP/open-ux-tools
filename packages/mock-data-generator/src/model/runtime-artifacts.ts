/** Verified package-local inputs passed to independently loaded learned components. */
export interface VerifiedModelArtifacts {
    ready: boolean;
    files: ReadonlyMap<string, ReadonlyMap<string, string>>;
    failures: ReadonlyArray<Readonly<{ componentId: string; role: string; reason: string }>>;
}
