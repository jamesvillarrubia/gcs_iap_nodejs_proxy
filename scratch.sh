# # gcloud config configurations activate madi-local

# # Set the project ID
export PROJECT_ID=madi-1220

# # Build the Docker image
docker buildx build --platform linux/amd64 -t jamesmtc/gin_proxy:latest .

# Push the Docker image to Google Container Registry
docker push gcr.io/${PROJECT_ID}/madi-1220-gcs-proxy

# # Deploy to Google Cloud Run
gcloud run deploy madi-1220-gcs-proxy-svc \
  --image gcr.io/${PROJECT_ID}/madi-1220-gcs-proxy\
  --port 3000 \
  --platform managed \
  --region us-central1