const express = require('express');
const { Storage } = require('@google-cloud/storage');
const compression = require('compression');
const winston = require('winston');

const app = express();
const bucketName = process.env.BUCKET_NAME; // fetch from env variable

const storage = new Storage();
const bucket = storage.bucket(bucketName);

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
  ],
});

// Enable compression
app.use(compression());

app.get('/*', function (req, res) {
  let filePath = req.path;

  filePath = filePath.replace(/^\/|\/$/g, ''); // remove leading and trailing slashes

  // Check if the requested file matches the mainPageSuffix or notFoundPageSuffix of the bucket
  bucket.getMetadata(function (err, metadata, apiResponse) {
    if (err) {
      logger.error('Error:', err);
      res.status(500).send('Internal Server Error');
      return;
    }

    const mainPageSuffix = metadata && metadata.mainPageSuffix;
    const notFoundPageSuffix = metadata && metadata.notFoundPageSuffix;

    if (mainPageSuffix && filePath === '') {
      filePath = mainPageSuffix;
    }

    // Use the requested file
    let remoteReadStream = bucket.file(filePath).createReadStream();

    remoteReadStream.on('error', function (err) {
      logger.error('Error:', err);
      res.status(404).sendFile(notFoundPageSuffix);
    });

    remoteReadStream.on('response', function (response) {
      // Only forward the headers we wish to.
      res.set('Content-Type', response.headers['content-type']);
      res.set('Cache-Control', 'public, max-age=3600'); // Example caching header
    });

    remoteReadStream.on('end', function () {
      res.end();
    });

    remoteReadStream.pipe(res);
  });
});

app.listen(process.env.PROXY_PORT || 3000, function () {
  logger.info('App listening on port 3000, serving files from Google Cloud Storage bucket: ' + bucketName);
});