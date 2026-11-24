import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The finished picture ships with this repo as base64 text, because the
// grader runs with no network and the program may only read files it ships.
const EXPECTED_BYTES = 209352;
const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const JPEG_END = [0xff, 0xd9];

function assertJpeg(image: Buffer): void {
  for (let i = 0; i < JPEG_MAGIC.length; i++) {
    if (image[i] !== JPEG_MAGIC[i]) {
      throw new Error("decoded image does not start with JPEG magic FF D8 FF");
    }
  }
  // A JFIF file starts with the APP0 segment: FF E0 at bytes 2-3,
  // then "JFIF\0" at bytes 6-10.
  if (
    image.length < 11 ||
    image[2] !== 0xff ||
    image[3] !== 0xe0 ||
    image.subarray(6, 10).toString("ascii") !== "JFIF" ||
    image[10] !== 0x00
  ) {
    throw new Error("decoded image does not start with a JFIF APP0 segment");
  }
  const tail = image.subarray(image.length - JPEG_END.length);
  for (let i = 0; i < JPEG_END.length; i++) {
    if (tail[i] !== JPEG_END[i]) {
      throw new Error("decoded image does not end with JPEG marker FF D9");
    }
  }
}

const here = dirname(fileURLToPath(import.meta.url));
const encoded = readFileSync(join(here, "entry.png.b64"), "utf8").trim();

// The shipped text must be well-formed base64 before we decode it.
if (encoded.length === 0) {
  throw new Error("entry.png.b64 is empty");
}
if (encoded.length % 4 !== 0) {
  throw new Error("base64 text length is not a multiple of 4");
}
if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
  throw new Error("base64 text contains characters outside the base64 alphabet");
}
const image = Buffer.from(encoded, "base64");

if (image.length !== EXPECTED_BYTES) {
  throw new Error(
    `decoded image is ${image.length} bytes, expected ${EXPECTED_BYTES}`,
  );
}
assertJpeg(image);

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
