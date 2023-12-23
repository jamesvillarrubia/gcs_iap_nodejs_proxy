const express = require('express');
const {Storage} = require('@google-cloud/storage');

const app = express();
const bucketName = 'sample-bucket-for-gcs-proxy-1';  // replace with your bucket name

const storage = new Storage();  
const bucket = storage.bucket(bucketName);

app.get('/*', function(req, res) {
    console.log(req.headers)
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

    remoteReadStream.on('end', function(){
        res.end();
    });

    remoteReadStream.pipe(res);
});

app.listen(3000, function () {
    console.log('App listening on port 3000, serving files from Google Cloud Storage bucket: ' + bucketName);
});
