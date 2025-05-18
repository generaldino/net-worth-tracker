import { Storage } from "@google-cloud/storage";
import { v4 as uuidv4 } from "uuid";

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS || "{}"),
});

const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || "";

/**
 * Uploads a file to Google Cloud Storage
 * @param file File buffer to upload
 * @param filename Original filename for extension
 * @returns URL of the uploaded file
 */
export async function uploadToGoogleCloudStorage(
  file: Buffer,
  filename: string
): Promise<string> {
  if (!bucketName) {
    throw new Error("Google Cloud Storage bucket name is not defined");
  }

  const bucket = storage.bucket(bucketName);

  // Generate a unique filename with original extension
  const extension = filename.split(".").pop() || "";
  const uniqueFilename = `${uuidv4()}.${extension}`;

  // Path in the bucket
  const filePath = `license-plates/${uniqueFilename}`;
  const fileObject = bucket.file(filePath);

  // Upload the file
  await fileObject.save(file, {
    contentType: `image/${extension}`,
    // Remove 'public: true' since we're using uniform bucket-level access
    metadata: {
      cacheControl: "public, max-age=31536000", // Cache for 1 year
    },
  });

  // Return the public URL
  return `https://storage.googleapis.com/${bucketName}/${filePath}`;
}

/**
 * Uploads multiple files to Google Cloud Storage
 * @param files Array of file buffers with their original filenames
 * @returns Array of URLs of the uploaded files
 */
export async function uploadMultipleFiles(
  files: Array<{ buffer: Buffer; originalname: string }>
): Promise<string[]> {
  const uploadPromises = files.map((file) =>
    uploadToGoogleCloudStorage(file.buffer, file.originalname)
  );

  return Promise.all(uploadPromises);
}
