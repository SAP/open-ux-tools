import { CreateBucketCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { isBtpEnvironment } from './utils/sap-system-utils';
import { once } from 'lodash';
import { logger } from './utils/logger';

export const getStorage = once(getStorageInternal);

async function getStorageInternal(): Promise<{ storage?: S3Client; bucket?: string }> {
    if (!isBtpEnvironment()) {
        return {};
    }

    const vcap = JSON.parse(process.env.VCAP_SERVICES ?? '');
    const objectStore = vcap['objectstore'][0].credentials;
    logger.info(`Bucket: ${JSON.stringify(objectStore)}`);
    const { access_key_id, bucket, secret_access_key, host, region, uri, username } = objectStore;

    const s3 = new S3Client({
        endpoint: `https://${host ?? uri}`,
        region,
        credentials: {
            accessKeyId: access_key_id,
            secretAccessKey: secret_access_key
        },
        forcePathStyle: true
    });

    return { storage: s3, bucket };
}
