declare namespace sap {
    namespace jest {
        function resolvePath(path: string): string;
        function registerMockMetadata(sPath, sData): void;
        function registerFakeFragment(sPath, sData): void;
    }
}