import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function saveGeneratedMarketingImage({
  title,
  base64,
}: {
  title: string;
  base64: string;
}) {
  const dir = path.join(process.cwd(), "public", "generated", "marketing");
  await mkdir(dir, { recursive: true });

  const fileName = `${Date.now()}-${slugify(title || "marketing-image")}.png`;
  const filePath = path.join(dir, fileName);

  await writeFile(filePath, Buffer.from(base64, "base64"));

  return {
    fileName,
    filePath,
    publicUrl: `/generated/marketing/${fileName}`,
  };
}
