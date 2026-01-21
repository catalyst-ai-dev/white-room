import type {
  DownloadStreamArgs,
  DownloadFileArgs,
  DownloadBufferArgs,
  UploadToS3Args,
  SignedUrlUploadArgs,
  RemoveFromS3Args,
  UploadDirArgs,
  ListObjectsArgs,
} from './s3.schemas';

import { randomUUID } from 'crypto';
import { getType } from 'mime';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsCommand,
} from '@aws-sdk/client-s3';

import { createLogger } from '@namespace/logger';
import { withoutLeadingSlash } from '@namespace/util';

import { S3Acl } from './s3.constants';

const logger = createLogger('s3.client');

const {
  AWS_ACCESS_KEY_ID = '',
  AWS_SECRET_ACCESS_KEY = '',
  AWS_REGION = 'us-east-1',
  AWS_FILES_BUCKET = '',
  SCRAPER_LAMBDA_ENV,
} = process.env;

export const isS3ClientEnabled =
  !!SCRAPER_LAMBDA_ENV || !!(AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && AWS_FILES_BUCKET);

const s3Client = isS3ClientEnabled
  ? new S3Client({
      region: AWS_REGION,
      ...(!SCRAPER_LAMBDA_ENV && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY
        ? {
            credentials: {
              accessKeyId: AWS_ACCESS_KEY_ID,
              secretAccessKey: AWS_SECRET_ACCESS_KEY,
            },
          }
        : {}),
    })
  : null;

export const s3BucketUrl = `https://s3.amazonaws.com/${AWS_FILES_BUCKET}`;

function assertS3Client(s3Client: S3Client | null): asserts s3Client is S3Client {
  if (!s3Client) {
    throw new Error('AWS S3 env keys are not set');
  }
}

/**
 * Downloads file from S3 bucket as a ReadableStream.
 *
 * @param {string} args.sourceFilePath Absolute path to the file to be downloaded.
 *
 * @return {ReadableStream} The stream.
 */
export async function downloadStream(args: DownloadStreamArgs) {
  assertS3Client(s3Client);

  const { sourceFilePath, bucket } = args;

  const command = new GetObjectCommand({
    Bucket: bucket || AWS_FILES_BUCKET,
    Key: sourceFilePath,
  });

  logger.debug({ args }, 'Downloading file from S3 bucket as a ReadableStream');

  const response = await s3Client.send(command);
  if (!response.Body || !('pipe' in response.Body)) {
    throw new Error('Response body is not a readable stream');
  }
  return response.Body as NodeJS.ReadableStream;
}

/**
 * Downloads a file from S3 and saves it locally.
 *
 * @param {string} bucket The name of the bucket.
 * @param {string} sourceFilePath The key of the file in the bucket.
 * @param {string} localFilePath The local path to save the file.
 */
export async function downloadFile({
  bucket,
  sourceFilePath,
  localFilePath,
}: DownloadFileArgs): Promise<string> {
  assertS3Client(s3Client);

  const params = {
    Bucket: bucket || AWS_FILES_BUCKET,
    Key: sourceFilePath,
  };

  const command = new GetObjectCommand(params);

  if (!localFilePath) {
    const fileName = path.basename(sourceFilePath);
    const fileExtension = path.extname(sourceFilePath);
    localFilePath = path.join(os.tmpdir(), `${fileName}-${randomUUID()}${fileExtension}`);
  }

  const { Body } = await s3Client.send(command);

  // Assuming Body is a readable stream, we save it to a file
  const writeStream = fs.createWriteStream(localFilePath);
  (Body as NodeJS.ReadableStream).pipe(writeStream);

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => resolve(localFilePath));
    writeStream.on('error', reject);
  });
}

/**
 * Downloads file from S3 bucket as a buffer.
 *
 * @param {string} args.sourceFilePath Absolute path to the file to be downloaded.
 *
 * @return {Promise} The buffer.
 */
export function downloadAsBuffer(args: DownloadBufferArgs): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      assertS3Client(s3Client);

      const { sourceFilePath, bucket } = args;

      const command = new GetObjectCommand({
        Bucket: bucket || AWS_FILES_BUCKET,
        Key: sourceFilePath,
      });

      logger.debug({ args }, 'Downloading file from S3 bucket');

      s3Client
        .send(command)
        .then((response) => {
          const stream = response.Body as NodeJS.ReadableStream;
          const chunks: Buffer[] = [];

          stream.on('data', (chunk: Buffer) => chunks.push(chunk));
          stream.once('end', () => resolve(Buffer.concat(chunks)));
          stream.once('error', reject);
        })
        .catch(reject);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Uploads a file to an S3 bucket.
 *
 * @param {string}  args.sourceFilePath   Absolute path to the file to be uploaded.
 * @param {string}  args.targetFilePath   Path in S3 bucket to upload file into.
 * @param {boolean} args.deleteSourceFile If true, uploaded file will be deleted locally.
 * @param {boolean} args.isPrivate        Uses 'authenticated-read' or 'public-read' ACL value.
 *
 * @return {Promise<string>}              Absolute URL to the uploaded file.
 */
export async function uploadToS3(args: UploadToS3Args): Promise<string> {
  assertS3Client(s3Client);

  const { sourceFilePath, deleteSourceFile, bucket, contentDisposition } = args;

  const acl = args.isPrivate ? S3Acl.AuthenticatedRead : S3Acl.PublicRead;

  const targetFilePath = withoutLeadingSlash(args.targetFilePath);
  const blob = fs.readFileSync(sourceFilePath);

  const command = new PutObjectCommand({
    Bucket: bucket || AWS_FILES_BUCKET,
    Key: targetFilePath,
    Body: blob,
    ACL: acl,
    ContentType: getType(sourceFilePath) || undefined,
    ContentDisposition: contentDisposition || undefined,
  });

  logger.debug({ args }, 'Uploading file to S3 bucket');

  await s3Client.send(command);

  if (deleteSourceFile) {
    try {
      await fs.promises.access(sourceFilePath);
      await fs.promises.unlink(sourceFilePath);
    } catch (error) {
      logger.warn({ sourceFilePath, error }, 'Failed to delete source file - file may not exist');
    }
  }

  const s3BucketUrl = `https://s3.amazonaws.com/${bucket || AWS_FILES_BUCKET}`;
  const uploadedFileUrl = `${s3BucketUrl}/${targetFilePath}`;

  logger.debug(`Uploaded file: ${uploadedFileUrl}`);

  return uploadedFileUrl;
}

export async function uploadToSignedS3ObjectUrl({
  s3PutObjectUrl,
  localFilePath,
}: SignedUrlUploadArgs) {
  logger.debug({ s3PutObjectUrl, localFilePath }, '[uploadToSignedS3ObjectUrl] Uploading file to Signed S3 Object URL');

  const fileBuffer = await fs.promises.readFile(localFilePath);
  const queryString = s3PutObjectUrl.split('?')[1];
  const headers = queryString ? Object.fromEntries(new URLSearchParams(queryString)) : {};

  const response = await fetch(s3PutObjectUrl, {
    method: 'PUT',
    headers,
    body: fileBuffer,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload to signed URL: ${response.statusText}`);
  }

  return response;
}

/**
 * Removes an object from an S3 bucket.
 *
 * @param {string} args.targetFilePath Path to file in S3 bucket to remove.
 *
 * @return {Promise<string>}           Absolute URL to the removed file.
 */
export async function removeFromS3(args: RemoveFromS3Args): Promise<string> {
  assertS3Client(s3Client);

  const targetFilePath = withoutLeadingSlash(args.targetFilePath);

  const command = new DeleteObjectCommand({
    Bucket: AWS_FILES_BUCKET,
    Key: targetFilePath,
  });

  logger.debug({ args }, 'Removing file from S3 bucket');

  await s3Client.send(command);

  const removedFileUrl = `${s3BucketUrl}/${targetFilePath}`;

  logger.debug({ removedFileUrl }, 'Removed file');

  return removedFileUrl;
}

/**
 * Uploads a directory to an S3 bucket.
 *
 * @param {string} dir
 * @param {string} bucketName
 *
 * @return {Promise}
 */
export async function uploadDirToS3({ dir, bucketName }: UploadDirArgs): Promise<void> {
  const files = await fs.promises.readdir(dir, { recursive: true });

  for (const filePath of files) {
    await uploadToS3({
      sourceFilePath: filePath,
      targetFilePath: path.relative(dir, filePath),
      bucket: bucketName,
    });
  }
}

/**
 * Lists objects in an S3 bucket.
 *
 * @param {string} Prefix to filter objects by.
 *
 * @return {Promise}
 */
export async function listObjectsInBucket({ bucketName, prefix }: ListObjectsArgs) {
  assertS3Client(s3Client);

  const command = new ListObjectsCommand({
    Bucket: bucketName,
    Prefix: prefix || '',
  });

  logger.debug({ prefix }, 'Listing objects in S3 bucket');

  const response = await s3Client.send(command);

  return response?.Contents || [];
}
