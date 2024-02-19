/* eslint-disable no-console */ // Only intend to run in CLI environment where we don't need more advanced logging
import { update } from '../helper/update-test-data';
import { FileFormat } from '../../../src/parser/types';

update(FileFormat.csv)
    .then(() => console.log('Csv tests updated'))
    .catch(console.error);
