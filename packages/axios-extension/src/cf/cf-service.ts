import {
    apiGetServicesInstancesFilteredByType,
    apiCreateServiceInstance,
    apiGetInstanceCredentials,
    cfGetTarget
} from '@sap/cf-tools';
import axios, { AxiosRequestConfig } from 'axios';
import {
    Destination,
    TokenExchangeDestination,
    CloudFoundryServiceInfo,
    ServiceInfo,
    isAppStudio
} from '@sap-ux/btp-utils';

const destinationInstanceName: string = 'abap-cloud-destination-instance';

function destinationInfoToAnswerDestination(
    destination: Destination,
    credentials: ServiceInfo['uaa']
): TokenExchangeDestination {
    return {
        ...destination,
        Type: 'HTTP',
        Authentication: 'OAuth2UserTokenExchange',
        URL: credentials.url,
        TokenServiceURLType: 'Dedicated',
        TokenServiceURL: `${credentials.url}/oauth/token`,
        ClientSecret: credentials.clientsecret,
        ClientId: credentials.clientid,
        WebIDEEnabled: 'true',
        WebIDEUsage: 'odata_abap,dev_abap,abap_cloud',
        'HTML5.Timeout': '60000',
        'HTML5.DynamicDestination': 'true'
    } as TokenExchangeDestination;
}

async function generateDestinationName(instanceName: string): Promise<string> {
    if (instanceName) {
        try {
            const target = await cfGetTarget(true);
            if (!target.space) {
                throw new Error(`Could not generate destination name.`);
            }
            const formattedInstanceName = `${instanceName}-${target.org}-${target.space}`
                .replace(/\W/gi, '-')
                .toLowerCase();
            return `abap-cloud-${formattedInstanceName}`.substring(0, 199);
        } catch (e) {
            throw new Error(`Could not generate destination name.`);
        }
    }
    throw new Error(`Could not generate destination name.`);
}

/**
 *  Create a new SAP BTP destination of type 'OAuth2UserTokenExchange' using cf-tools to populate the UAA properties.
 *
 * @param destination destination info
 */
export async function createBtpDestination(destination: Destination): Promise<void> {
    if (!isAppStudio()) {
        throw new Error(`Creating SAP BTP destinations is only supported on SAP Business Application Studio`);
    }
    const destinationName: string = await generateDestinationName(destination.Name);
    const instances: CloudFoundryServiceInfo[] = await apiGetServicesInstancesFilteredByType(['destination']);
    const destinationInstance = instances.find(
        (instance: CloudFoundryServiceInfo) => instance.label === destinationInstanceName
    );

    if (!destinationInstance) {
        await apiCreateServiceInstance('destination', 'lite', destinationInstanceName, null).then(function (res) {
            // If there is an error it is returned in the result
            if (res && res.stderr) {
                throw new Error(`Failed to create destination instance ${res.stderr}`);
            }
        });
    }

    const destinationInstanceCredentials: any = await apiGetInstanceCredentials(destinationInstanceName);
    const flatDestination = destinationInfoToAnswerDestination(
        { ...destination, Name: destinationName },
        destinationInstanceCredentials.credentials
    );

    try {
        /* Axios exposes the version in the user-agent header, creating a security issue.
        To address this, we override the header for enhanced security.*/
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': 'Bas'
        };

        const reqConfig: AxiosRequestConfig = {
            method: 'post',
            url: `${process.env.H2O_URL}/api/createDestination`,
            headers,
            data: flatDestination
        };
        await axios.request(reqConfig);
    } catch (err: any) {
        console.log(
            `Couldn't create the destination from following error: ${err.message}. Error code=${err.response?.status}`
        );
        throw err;
    }
}
