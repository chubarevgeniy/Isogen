import { Worker } from 'worker_threads';

const workerCode = `
// mock self for node
const self = global;
`;
// Actually, let's just write a ts-node script that imports the logic.
