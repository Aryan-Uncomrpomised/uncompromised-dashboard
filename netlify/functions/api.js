const serverless = require('serverless-http');
const app = require('../../server/index.cjs');

module.exports.handler = serverless(app);
