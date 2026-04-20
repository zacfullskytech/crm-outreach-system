import { BlobSASPermissions, BlobServiceClient, SASProtocol, StorageSharedKeyCredential, generateBlobSASQueryParameters } from "@azure/storage-blob";

function getAppBaseUrl() {
  return (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function getStorageConfig() {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || "marketing-assets";

  if (!accountName || !accountKey) {
    throw new Error("Azure Blob Storage is not configured. Set AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY.");
  }

  return { accountName, accountKey, containerName };
}

function createContainerClient() {
  const { accountName, accountKey, containerName } = getStorageConfig();
  const credential = new StorageSharedKeyCredential(accountName, accountKey);
  const serviceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, credential);
  return serviceClient.getContainerClient(containerName);
}

export function getMarketingAssetAppUrl(blobName: string) {
  return `${getAppBaseUrl()}/api/marketing-content/assets/${encodeURIComponent(blobName)}`;
}

function buildBlobName(folder: string, fileName: string, fallbackBaseName: string) {
  const extension = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : undefined;
  const safeBaseName = slugify(fileName.replace(/\.[^.]+$/, "") || fallbackBaseName) || fallbackBaseName;
  const suffix = extension ? `.${extension}` : "";
  return `${folder}/${Date.now()}-${safeBaseName}${suffix}`;
}

export async function saveGeneratedMarketingImage({
  title,
  base64,
}: {
  title: string;
  base64: string;
}) {
  const containerClient = createContainerClient();

  // Keep the container private. Reads are served through SAS URLs.
  await containerClient.createIfNotExists();

  const fileName = `${Date.now()}-${slugify(title || "marketing-image")}.png`;
  const blobName = `generated/marketing/${fileName}`;
  const blobClient = containerClient.getBlockBlobClient(blobName);
  const buffer = Buffer.from(base64, "base64");

  await blobClient.uploadData(buffer, {
    blobHTTPHeaders: {
      blobContentType: "image/png",
    },
  });

  return {
    fileName,
    blobName,
    blobUrl: blobClient.url,
    appUrl: getMarketingAssetAppUrl(blobName),
  };
}

export async function uploadMarketingAsset({
  fileName,
  contentType,
  buffer,
  folder = "library/marketing",
}: {
  fileName: string;
  contentType: string;
  buffer: Buffer;
  folder?: string;
}) {
  const containerClient = createContainerClient();
  await containerClient.createIfNotExists();

  const blobName = buildBlobName(folder, fileName, "marketing-asset");
  const blobClient = containerClient.getBlockBlobClient(blobName);

  await blobClient.uploadData(buffer, {
    blobHTTPHeaders: {
      blobContentType: contentType || "application/octet-stream",
    },
  });

  return {
    fileName,
    blobName,
    blobUrl: blobClient.url,
    signedUrl: getMarketingImageSignedUrl(blobName),
    appUrl: getMarketingAssetAppUrl(blobName),
  };
}

export function getMarketingImageSignedUrl(blobName: string, expiresInMinutes = 60) {
  const { accountName, accountKey, containerName } = getStorageConfig();
  const credential = new StorageSharedKeyCredential(accountName, accountKey);
  const startsOn = new Date(Date.now() - 60 * 1000);
  const expiresOn = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  const sas = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse("r"),
      startsOn,
      expiresOn,
      protocol: SASProtocol.Https,
    },
    credential,
  ).toString();

  return `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sas}`;
}

export async function downloadMarketingAsset(blobName: string) {
  const containerClient = createContainerClient();
  const blobClient = containerClient.getBlobClient(blobName);
  const response = await blobClient.download();

  return {
    stream: response.readableStreamBody,
    contentType: response.contentType || "application/octet-stream",
    cacheControl: response.cacheControl || "public, max-age=3600",
    etag: response.etag || null,
    lastModified: response.lastModified || null,
  };
}

export function getBlobNameFromUrl(url: string) {
  const { accountName, containerName } = getStorageConfig();
  const blobPrefix = `https://${accountName}.blob.core.windows.net/${containerName}/`;
  const appPrefix = `${getAppBaseUrl()}/api/marketing-content/assets/`;

  if (url.startsWith(blobPrefix)) {
    const withoutPrefix = url.slice(blobPrefix.length);
    const [blobName] = withoutPrefix.split("?");
    return blobName || null;
  }

  if (url.startsWith(appPrefix)) {
    const withoutPrefix = url.slice(appPrefix.length);
    const [blobName] = withoutPrefix.split("?");
    return decodeURIComponent(blobName || "") || null;
  }

  return null;
}
