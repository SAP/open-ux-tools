import { promptGeneratorInput } from '../src';

promptGeneratorInput()
    .then(() => console.info('done'))
    .catch((e) => console.error(e));
