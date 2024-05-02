import { writeFileSync } from 'fs';
import { join } from 'path';
import type { AbapServiceProvider, ArchiveFileNode } from '@sap-ux/axios-extension';
import {
    ODataVersion,
    TransportChecksService,
    TransportRequestService,
    ListPackageService,
    FileStoreService,
    BusinessObjectsService,
    GeneratorService,
    PublishService
} from '@sap-ux/axios-extension';
import { logger } from './types';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

/**
 * Execute a sequence of test calls using the given provider.
 *
 * @param provider instance of a service provider
 * @param env object reprensenting the content of the .env file.
 * @param env.TEST_OUTPUT target directory for output
 */
export async function useCatalogAndFetchSomeMetadata(
    provider: AbapServiceProvider,
    env: {
        TEST_OUTPUT: string;
    }
): Promise<void> {
    try {
        const atoSettings = await provider.getAtoInfo();
        if (!atoSettings || Object.keys(atoSettings).length === 0) {
            console.warn('ATO setting is empty!');
        }
        // check v2 services
        const catalog = provider.catalog(ODataVersion.v2);
        const services = await catalog.listServices();
        writeFileSync(join(env.TEST_OUTPUT, 'v2-catalog.json'), JSON.stringify(services, null, 4));

        // check v4 services
        const v4Catalog = provider.catalog(ODataVersion.v4);
        const v4Services = await v4Catalog.listServices();
        writeFileSync(join(env.TEST_OUTPUT, 'v4-catalog.json'), JSON.stringify(v4Services, null, 4));

        const serviceInfo = services.find((service) => service.name.includes('SEPMRA_PROD_MAN'));

        if (serviceInfo) {
            const service = provider.service(serviceInfo.path);
            const metadata = await service.metadata();
            writeFileSync(join(env.TEST_OUTPUT, 'metadata.xml'), metadata);

            const annotations = await catalog.getAnnotations(serviceInfo);
            annotations.forEach((anno) => {
                writeFileSync(join(env.TEST_OUTPUT, `${anno.TechnicalName}.xml`), anno.Definitions);
            });
        }
    } catch (error) {
        console.error(error.cause || error.toString() || error);
    }
}

/**
 * Execute a sequence of test calls using the given provider.
 *
 * @param provider instance of a service provider
 * @param env object representing the content of the .env file.
 * @param env.TEST_PACKAGE optional package name for testing fetch transport numbers
 * @param env.TEST_APP optional project name for testing fetch transport numbers, new project doesn't exist on backend is also allowed
 */
export async function useAdtServices(
    provider: AbapServiceProvider,
    env: {
        TEST_PACKAGE: string;
        TEST_APP: string;
    }
): Promise<void> {
    try {
        const atoSettings = await provider.getAtoInfo();
        if (!atoSettings || Object.keys(atoSettings).length === 0) {
            logger.warn('ATO setting is empty!');
        }
        const transportChecksService = await provider.getAdtService<TransportChecksService>(TransportChecksService);
        const transportRequestList = await transportChecksService.getTransportRequests(env.TEST_PACKAGE, env.TEST_APP);
        if (transportRequestList.length === 0) {
            logger.info(`Transport number is empty for package name ${env.TEST_PACKAGE}, app name ${env.TEST_APP}`);
        } else {
            logger.info(JSON.stringify(transportRequestList));
        }

        const trasnportRequestService = await provider.getAdtService<TransportRequestService>(TransportRequestService);
        const newTransportNumber = await trasnportRequestService.createTransportRequest({
            packageName: env.TEST_PACKAGE,
            ui5AppName: env.TEST_APP,
            description: 'Test from odata-cli'
        });
        logger.info(`Created transport number: ${newTransportNumber}`);

        const listPackageService = await provider.getAdtService<ListPackageService>(ListPackageService);
        const packages = await listPackageService.listPackages({ maxResults: 50, phrase: '$TMP' });
        logger.info(`Query $tmp package: ${packages.length === 1}`);

        const fileStoreService = await provider.getAdtService<FileStoreService>(FileStoreService);
        const rootFolderContent = await fileStoreService.getAppArchiveContent('folder', env.TEST_APP);
        logger.info(
            `Deployed archive for ${env.TEST_APP} contains: ${(rootFolderContent as ArchiveFileNode[])
                .map((node) => node.basename)
                .join(',')}`
        );

        // Query and log the first encountered file content inside env.TEST_APP
        const fileList = rootFolderContent.filter((node) => node.type === 'file');
        if (fileList.length > 0) {
            const fileContent = await fileStoreService.getAppArchiveContent('file', env.TEST_APP, fileList[0].path);
            logger.info(`File content of ${fileList[0].path} is:`);
            logger.info(fileContent);
        } else {
            logger.info(`No file in ${env.TEST_APP}`);
        }
        // Query and log the first encountered folder content inside env.TEST_APP
        const folderList = rootFolderContent.filter((node) => node.type === 'folder');
        if (folderList.length > 0) {
            const folderContent = await fileStoreService.getAppArchiveContent(
                'folder',
                env.TEST_APP,
                folderList[0].path
            );
            logger.info(
                `Folder ${folderList[0].path} contains: ${(folderContent as ArchiveFileNode[])
                    .map((node) => node.basename)
                    .join(',')}`
            );
        } else {
            logger.info(`No folder in ${env.TEST_APP}`);
        }
    } catch (error) {
        logger.error(error.cause || error.toString() || error);
    }
}

/**
 * Execute a sequence of check, deploy and undeploy requests for a DTA project.
 *
 * @param provider instance of a service provider
 * @param env object representing the content of the .env file.
 * @param env.TEST_ZIP path to a zipped webapp folder of an adaptation project that should be deployed
 * @param env.TEST_NAMESPACE namespaces containing the referenced app as well as the new project id
 * @param env.TEST_PACKAGE optional package name
 * @param env.TEST_TRANSPORT optional transport id
 */
export async function testDeployUndeployDTA(
    provider: AbapServiceProvider,
    env: {
        TEST_ZIP: string;
        TEST_NAMESPACE: string;
        TEST_PACKAGE?: string;
        TEST_TRANSPORT?: string;
    }
): Promise<void> {
    const service = provider.getLayeredRepository();
    try {
        let response = await service.isExistingVariant(env.TEST_NAMESPACE);
        logger.info(`isExistingVariant: ${response.status}`);

        response = await service.deploy(env.TEST_ZIP, {
            namespace: env.TEST_NAMESPACE,
            'package': env.TEST_PACKAGE,
            transport: env.TEST_TRANSPORT
        });
        logger.info(response.request.url);
        logger.info(`deploy: ${response.status}`);

        if (response.status === 200) {
            response = await service.isExistingVariant(env.TEST_NAMESPACE);
            logger.info(`isExistingVariant: ${response.status}`);

            response = await service.undeploy({
                namespace: env.TEST_NAMESPACE,
                'package': env.TEST_PACKAGE,
                transport: env.TEST_TRANSPORT
            });
            logger.info(`undeploy: ${response.status}`);
        }
    } catch (error) {
        logger.error(`Error: ${error.message}`);
    }
}

/**
 * Parse an XML document for ATO (Adaptation Transport Organizer) settings.
 *
 * @param xml xml document containing ATO settings
 * @returns parsed ATO settings
 */
function parseResponse<T>(xml: string): T {
    if (XMLValidator.validate(xml) !== true) {
        this.log.warn(`Invalid XML: ${xml}`);
        return {} as T;
    }
    const options = {
        attributeNamePrefix: '',
        ignoreAttributes: false,
        ignoreNameSpace: true,
        parseAttributeValue: true,
        removeNSPrefix: true
    };
    const parser: XMLParser = new XMLParser(options);
    return parser.parse(xml, true) as T;
}

export async function testUiServiceGenerator(
    provider: AbapServiceProvider,
    env: {
        TEST_BO_NAME: string;
        TEST_PACKAGE: string;
    }
): Promise<void> {
    const s4Cloud = await provider.isS4Cloud();
    if (!s4Cloud) {
        logger.warn('Not an S/4 Cloud system. UI service generation might not be supported.');
    }

    //
    // Get BOs
    const businesObjects = await provider.getAdtService<BusinessObjectsService>(BusinessObjectsService);
    const bos = await businesObjects.getBusinessObjects();
    const bo = bos.find((bo) => bo.name === env.TEST_BO_NAME);
    //logger.info(JSON.stringify(bos));

    //
    // Generator service
    const generatorService = await provider.getAdtService<GeneratorService>(GeneratorService);
    const generatorConfig = await generatorService.getUIServiceGeneratorConfig(bo.name, logger);
    //logger.info('generatorConfig: ' + JSON.stringify(generatorConfig));
    const generator = await provider.getUiServiceGenerator(bo);
    const content = await generator.getContent(env.TEST_PACKAGE);
    //logger.info('content: ' + content);
    let generatedRefs;
    try {
        generatedRefs = await generator.generate(content, 'JK5K900164');
        logger.info('generatedRefs: ' + JSON.stringify(generatedRefs));
    } catch (error) {
        logger.error(error);
    }

    //
    // Publish (including lock service binding)
    if (generatedRefs) {
        const serviceLockGen = await provider.lockServiceBinding(generatedRefs.objectReference.uri);
        try {
            await serviceLockGen.lockServiceBinding();
        } catch (error) {
            //logger.error(error);
            if (error.response && error.response.status === 403) {
                logger.warn(`${error.code} ${error.response.status} ${error.response.data}`);
            } else {
                logger.warn(error);
                //logger.warn(`${error.code} ${error.response.status} ${error.response.data}`);
                return;
            }
        }
    }
    const publishService = await provider.getAdtService<PublishService>(PublishService);
    try {
        const publishResult = await publishService.publish(
            generatedRefs.objectReference.type,
            generatedRefs.objectReference.name
        );
        this.log(`Publish: ${publishResult.SEVERITY} ${publishResult.LONG_TEXT || publishResult.SHORT_TEXT}`);
    } catch (error) {
        logger.error(error);
    }

    logger.info('done');
}
