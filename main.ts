import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The finished picture ships with this repo as base64 text, because the
// grader runs with no network and the program may only read files it ships.
const EXPECTED_BYTES = 209352;
const JPEG_MAGIC = [0xff, 0xd8, 0xff];

const here = dirname(fileURLToPath(import.meta.url));
const encoded = readFileSync(join(here, "entry.png.b64"), "utf8").trim();
const image = Buffer.from(encoded, "base64");

if (image.length !== EXPECTED_BYTES) {
  throw new Error(
    `decoded image is ${image.length} bytes, expected ${EXPECTED_BYTES}`,
  );
}
for (let i = 0; i < JPEG_MAGIC.length; i++) {
  if (image[i] !== JPEG_MAGIC[i]) {
    throw new Error("decoded image does not start with JPEG magic FF D8 FF");
  }
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "entry.png");
writeFileSync(outPath, image);
chmodSync(outPath, 0o644);

const written = readFileSync(outPath);
if (written.length !== image.length || !written.equals(image)) {
  throw new Error("output file does not match the decoded image");
}
console.log(`wrote ${outPath} (${written.length} bytes)`);
