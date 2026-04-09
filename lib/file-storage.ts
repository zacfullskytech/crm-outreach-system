import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";

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

export async function saveGeneratedMarketingImage({
  title,
  base64,
}: {
  title: string;
  base64: string;
}) {
  const { accountName, accountKey, containerName } = getStorageConfig();
  const credential = new StorageSharedKeyCredential(accountName, accountKey);
  const serviceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, credential);
  const containerClient = serviceClient.getContainerClient(containerName);

  await containerClient.createIfNotExists({ access: "blob" });

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
    publicUrl: blobClient.url,
  };
}
