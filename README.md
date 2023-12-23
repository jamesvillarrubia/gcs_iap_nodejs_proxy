# NodeJS GCS IAP Proxy for CloudRun

Simple set of commands to get going.  First run the following with your bucket and port names

```shell
docker buildx build --platform linux/amd64 .
```

Then push the image to the right repo:
```shell
PORT=8000;
BUCKET_NAME="my-bucket"
gcloud run deploy SERVICE_NAME \ 
    --image IMAGE_URL \ 
    --set-env-vars BUCKET_NAME=$BUCKET_NAME,PORT=$PORT
```


You can also push to artifact repository

# Push the Docker image to Google Container Registry

```shell
${LOCATION}-docker.pkg.dev/${PROJECTID}/${REPOSITORY}/${IMAGE}
```

For example: 
```shell
us-east1-docker.pkg.dev/my-project/my-repo/test-image
```

Then the code to push to cloud run is:
```shell
gcloud run deploy madi-1220-gcs-proxy-svc \ 
  --image us-east1-docker.pkg.dev/madi-1220/my-repo/test-image
  --port 3000 \ 
  --set-env-vars BUCKET_NAME=$BUCKET_NAME,PORT=$PORT \ 
  --platform managed \ 
  --region us-central1
