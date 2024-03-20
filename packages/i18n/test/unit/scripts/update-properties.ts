/* eslint-disable no-console */ // Only intend to run in CLI environment where we don't need more advanced logging
import { update } from '../helper/update-test-data';
import { FileFormat } from '../../../src/parser/types';

update(FileFormat.properties)
    .then(() => console.log('Properties tests updated'))
    .catch(console.error);
