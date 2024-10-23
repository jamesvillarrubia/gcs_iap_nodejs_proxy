import express from 'express';
import { Storage } from '@google-cloud/storage';
import compression from 'compression';
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

// Define '__dirname' in ES module scope
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
console.log(process.env);
const bucketName = process.env.BUCKET_NAME;
let storage
if(process.env.BUCKET_HOST){
    storage = new Storage({
        apiEndpoint: process.env.BUCKET_HOST || 'https://storage.googleapis.com',
    });
}else{
    storage = new Storage();
}


const bucket = storage.bucket(bucketName);

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
    ],
});

app.use(compression());

const getBucketMetadata = async () => {
    try {
        const [metadata] = await bucket.getMetadata();
        return metadata;
    } catch (err) {
        logger.error('Error:', err);
        return {
            mainPageSuffix: 'index.html',
            notFoundPage: '404.html',
        };
    }
};

const serveErrorFile = async (res, errorFilePath) => {
    const errorFile = bucket.file(errorFilePath);
    const [errorFileExists] = await errorFile.exists();
    if (!errorFileExists) {
        logger.error('Error file missing.');
        res.status(500).end('Internal Server Error');
        return;
    }

    const errorStream = errorFile.createReadStream();
    errorStream.pipe(res);
};

app.get('/*', async (req, res) => {
    let filePath = req.path.replace(/^\/|\/$/g, '');

    const metadata = await getBucketMetadata();
    const mainPageSuffix = metadata.mainPageSuffix || 'index.html';
    const notFoundPagePath = metadata.notFoundPage || '404.html';

    filePath = filePath === '' ? mainPageSuffix : filePath;

    // Check for the file with '.html' extension
    let file = bucket.file(filePath + '.html');
    let [fileExists] = await file.exists();

    if (!fileExists) {
        // If the file with '.html' extension doesn't exist, check for the file without the extension
        file = bucket.file(filePath);
        [fileExists] = await file.exists();
    }

    if (!fileExists) {
        res.status(404);
        await serveErrorFile(res, notFoundPagePath);
        return;
    }

    const remoteReadStream = file.createReadStream();

    remoteReadStream.on('error', async () => {
        res.status(404);
        await serveErrorFile(res, notFoundPagePath);
    });

    remoteReadStream.on('response', (response) => {
        res.set('Content-Type', response.headers['content-type']);
        res.set('Cache-Control', 'public, max-age=3600');
    });

    // Forward GCS Identity Aware Proxy (IAP) credentials and headers
    const forwardedHeaders = {};
    if (req.headers['x-goog-authenticated-user-email']) {
        forwardedHeaders['x-goog-authenticated-user-email'] = req.headers['x-goog-authenticated-user-email'];
    }
    if (req.headers['x-goog-authenticated-user-id']) {
        forwardedHeaders['x-goog-authenticated-user-id'] = req.headers['x-goog-authenticated-user-id'];
    }
    if (req.headers['x-goog-iap-jwt-assertion']) {
        forwardedHeaders['x-goog-iap-jwt-assertion'] = req.headers['x-goog-iap-jwt-assertion'];
    }
    if (Object.keys(forwardedHeaders).length > 0) {
        remoteReadStream.on('request', (requestOptions) => {
            requestOptions.headers = { ...requestOptions.headers, ...forwardedHeaders };
        });
    }

    remoteReadStream.pipe(res);
});

const port = process.env.PROXY_PORT || 3000;
app.listen(port, () => {
    logger.info(`App listening on port ${port}, serving files from Google Cloud Storage bucket: ${bucketName}`);
});