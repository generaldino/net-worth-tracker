# Google Cloud Storage Setup

This application uses Google Cloud Storage to store and serve images for license plates. Follow these steps to set up Google Cloud Storage for your development or production environment.

## Prerequisites

- A Google Cloud Platform account
- A Google Cloud project
- A Google Cloud Storage bucket

## Setting Up Environment Variables

You need to add the following environment variables to your `.env.local` file:

```
# Google Cloud Storage Config
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_BUCKET_NAME=your-bucket-name
# The credentials JSON needs to be stringified
GOOGLE_CLOUD_CREDENTIALS={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

## Creating a Service Account

1. Go to the Google Cloud Console
2. Navigate to "IAM & Admin" > "Service Accounts"
3. Click "Create Service Account"
4. Enter a name and description
5. Assign the "Storage Object Admin" role (or a more restricted role if preferred)
6. Create a JSON key and download it
7. Copy the content of the JSON key file and paste it as the value of the `GOOGLE_CLOUD_CREDENTIALS` environment variable

## Setting Up the Bucket

1. Go to the Google Cloud Console
2. Navigate to "Storage" > "Browser"
3. Click "Create Bucket"
4. Enter a globally unique name for your bucket
5. Choose region, storage class, and access control settings
6. Make sure the bucket allows public access or configure the permissions according to your needs
7. Add the bucket name to the `GOOGLE_CLOUD_BUCKET_NAME` environment variable

## Vercel Deployment

When deploying to Vercel, add these environment variables in the Vercel dashboard:

1. Go to your project settings in Vercel
2. Navigate to the "Environment Variables" section
3. Add all three environment variables

## Local Development

For local development, create a `.env.local` file in the root of your project and add the environment variables there.

## Troubleshooting

- If you see permission errors, check the IAM roles assigned to your service account
- If files aren't publicly accessible, check the bucket permissions and ACLs
- Validate your JSON credentials by ensuring they are properly stringified
