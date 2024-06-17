declare module '@sap-ux/fiori-annotation-api' {
    export class FioriAnnotationService {
        public static createService(project: Project, serviceName: string, appName: string): FioriAnnotationService {}
        public sync(): void;
        public getSchema(): RawMetadata;
    }
}
