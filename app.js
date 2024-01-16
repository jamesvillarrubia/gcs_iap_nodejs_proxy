import express from 'express';
import { Storage } from '@google-cloud/storage';
import compression from 'compression';
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

// Define '__dirname' in ES module scope
const __dirname = path.dirname(fileURLToPath(import.meta.url));


const app = express();
const bucketName = process.env.BUCKET_NAME;

const storage = new Storage({
    apiEndpoint: process.env.BUCKET_HOST || 'https://storage.googleapis.com',
});

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
            notFoundPageSuffix: '404.html',
        };
    }
};

app.get('/*', async (req, res) => {
    let filePath = req.path.replace(/^\/|\/$/g, '');

    const metadata = await getBucketMetadata();
    const mainPageSuffix = metadata.mainPageSuffix || 'index.html';
    const notFoundPagePath = metadata.notFoundPage || '404.html';

    if (mainPageSuffix && filePath === '') {
        filePath = mainPageSuffix;
    }

    const file = bucket.file(filePath);
    const errorFile = bucket.file(notFoundPagePath);
    let [errorFileExists] = await errorFile.exists()
    if(!errorFileExists){
        logger.error('Error File Missing. ', err);
        res.status(500).end('Internal Server Error');
        return;
    }


    const [fileExists] = await file.exists()

    if(!fileExists){
        res.status(404)
        const errorStream = errorFile.createReadStream();
        errorStream.pipe(res)
        return;
    }else{
        const remoteReadStream = file.createReadStream();

        remoteReadStream.on('error', err => {
            res.status(404)
            const errorStream = errorFile.createReadStream();
            errorStream.pipe(res)
            return;
        });
    
        remoteReadStream.on('response', response => {
            res.set('Content-Type', response.headers['content-type']);
            res.set('Cache-Control', 'public, max-age=3600');
        });
    
        remoteReadStream.on('end', () => {
            res.end();
        });
    
        remoteReadStream.pipe(res);
    }

  
});

const port = process.env.PROXY_PORT || 3000;
app.listen(port, () => {
    logger.info(`App listening on port ${port}, serving files from Google Cloud Storage bucket: ${bucketName}`);
});