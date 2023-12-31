const express = require('express');
const {Storage} = require('@google-cloud/storage');

const app = express();
const bucketName = process.env.BUCKET_NAME;  // fetch from env variable

const storage = new Storage();  
const bucket = storage.bucket(bucketName);

app.get('/*', function(req, res) {
    let filePath = req.path;
    
    filePath = filePath.replace(/^\/|\/$/g, ''); // remove leading and trailing slashes
    let remoteReadStream = bucket.file(filePath).createReadStream();

    remoteReadStream.on('error', function(err) {
        console.log('Error:', err);
        res.status(500).send(err);
    });

    remoteReadStream.on('response', function(response) {
        // Only forward the headers we wish to.
        res.set('Content-Type', response.headers['content-type']);
    });

    remoteReadStream.on('end', function() {
        res.end();
    });

    remoteReadStream.pipe(res);
});

app.listen(process.env.PROXY_PORT || 3000, function () {
    console.log('App listening on port 3000, serving files from Google Cloud Storage bucket: ' + bucketName);
});
