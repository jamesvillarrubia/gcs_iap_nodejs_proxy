import express from 'express';
import { Storage } from '@google-cloud/storage';
import winston from 'winston';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import routeCache from 'route-cache';
import cors from 'cors';

dotenv.config();

const app = express();

const bucketHost = process.env.BUCKET_HOST || 'https://storage.googleapis.com';
const storage = new Storage({apiEndpoint: bucketHost});
const bucket = storage.bucket(process.env.BUCKET_NAME, { baseUrl: bucketHost });

const notFoundPagePath = '404.html';

// Configure Winston logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'app.log' })
    ]
});

const forwardHeaders = (req, readStream) => {
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
        readStream.on('request', (requestOptions) => {
            requestOptions.headers = { ...requestOptions.headers, ...forwardedHeaders };
        });
    }
};

const serveFile = async (file, req, res) => {
    try {
        const [exists] = await file.exists();

        if (!exists) {
            return false;
        }

        const [metadata] = await file.getMetadata();
        const contentType = metadata.contentType;

        res.setHeader('Content-Type', contentType);

        // Set cache control headers
        const cacheControl = req.cacheControl;
        if (cacheControl) {
            res.setHeader('Cache-Control', cacheControl);
        }

        const readStream = file.createReadStream();
        forwardHeaders(req, readStream);

        readStream.on('error', (err) => {
            logger.error('Error reading file:', err);
            res.status(500).send('Internal server error');
        });

        readStream.pipe(res);
        return true;
    } catch (error) {
        logger.error(`Error serving file: ${error.message}`);
        res.status(500).send('Internal server error');
    }
};

// Enable gzip compression
app.use(compression());

// Add security headers
app.use(helmet());

// Implement rate limiting
if (process.env.RATE_LIMIT_ENABLED === 'true') {
    const limiter = rateLimit({
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
        max: parseInt(process.env.RATE_LIMIT_MAX) || 100
    });
    app.use(limiter);
}

// Enable caching
if (process.env.CACHE_ENABLED === 'true') {
    const cacheDuration = process.env.CACHE_DURATION || 20000;
    app.use(routeCache.cacheSeconds(Math.round(cacheDuration/1000)));
}

// Enable CORS
app.use(cors());

app.get('/*', async (req, res) => {
    const filePath = req.path.replace(/^\/|\/$/g, '');

    logger.info(`Requested file: ${filePath}`);

    let file;
    if (filePath === '') {
        // Use index.html for the root path
        file = bucket.file('index.html');
    } else {
        file = bucket.file(filePath);
    }

    const served = await serveFile(file, req, res);

    if (!served) {
        // Serve the 404.html file if the requested file doesn't exist
        const notFoundFile = bucket.file(notFoundPagePath);
        const notFoundServed = await serveFile(notFoundFile, req, res);

        if (notFoundServed) {
            logger.info(`Served 404.html for file: ${filePath}`);
            res.status(404);
        } else {
            logger.warn(`File not found: ${filePath}`);
            res.status(404).send('File not found');
        }
    } else {
        logger.info(`Served file: ${filePath || 'index.html'}`);
    }
});


const port = process.env.PROXY_PORT || 3000;
const server = app.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
    logger.info('Received shutdown signal. Shutting down gracefully...');

    server.close(() => {
        logger.info('Server closed. Exiting process...');
        process.exit(0);
    });

    // Set a timeout to force shutdown if the server doesn't close within a certain time
    setTimeout(() => {
        logger.warn('Forced shutdown due to timeout. Exiting process...');
        process.exit(1);
    }, 5000); // Adjust the timeout value as needed
}


export default server;