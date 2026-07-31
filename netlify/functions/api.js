const serverless = require('serverless-http');
const app = require('../../server/index.cjs');

// Tell serverless-http to treat these MIME types as binary
// so Excel/zip buffers are not corrupted by base64 encoding
module.exports.handler = serverless(app, {
  binary: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream',
    'application/zip'
  ]
});
