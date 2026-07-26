import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const packageDir = join(repoRoot, "packages/server-act");
const packageManifestPath = join(packageDir, "package.json");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const requiredFiles = [
  "dist/index.mjs",
  "dist/index.cjs",
  "dist/index.d.mts",
  "dist/index.d.cts",
  "dist/utils.mjs",
  "dist/utils.cjs",
  "dist/utils.d.mts",
  "dist/utils.d.cts",
  "package.json",
  "README.md",
];

function getGitStatus() {
  return execFileSync(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=all"],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );
}

const manifestBefore = readFileSync(packageManifestPath);
const sourceManifest = JSON.parse(manifestBefore.toString("utf8"));
const statusBefore = getGitStatus();
const errors = [];
let tempDir;

try {
  tempDir = mkdtempSync(join(tmpdir(), "server-act-pack-"));
  const packOutput = execFileSync(
    npmCommand,
    ["pack", "--json", "--pack-destination", tempDir],
    {
      cwd: packageDir,
      encoding: "utf8",
      env: {
        ...process.env,
        npm_config_cache: join(tempDir, "npm-cache"),
      },
      stdio: ["ignore", "pipe", "inherit"],
    },
  );
  const packResults = JSON.parse(packOutput);

  assert.ok(Array.isArray(packResults), "npm pack did not return a JSON array");
  assert.equal(
    packResults.length,
    1,
    "npm pack must return exactly one result",
  );

  const [packResult] = packResults;
  assert.equal(packResult.name, sourceManifest.name, "packed name mismatch");
  assert.equal(
    packResult.version,
    sourceManifest.version,
    "packed version mismatch",
  );

  const tarballs = readdirSync(tempDir).filter((file) => file.endsWith(".tgz"));
  assert.equal(tarballs.length, 1, "npm pack must create exactly one tarball");
  assert.equal(
    tarballs[0],
    basename(packResult.filename),
    "tarball filename does not match npm pack output",
  );
  assert.ok(
    statSync(join(tempDir, tarballs[0])).isFile(),
    "packed tarball is not a file",
  );

  const packedFiles = new Set(packResult.files.map((file) => file.path));
  for (const requiredFile of requiredFiles) {
    assert.ok(
      packedFiles.has(requiredFile),
      `packed tarball is missing ${requiredFile}`,
    );
  }
} catch (error) {
  errors.push(error);
}

if (tempDir) {
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch (error) {
    errors.push(error);
  }
}

try {
  const manifestAfter = readFileSync(packageManifestPath);
  assert.ok(
    manifestBefore.equals(manifestAfter),
    "npm pack changed packages/server-act/package.json",
  );
  assert.equal(
    getGitStatus(),
    statusBefore,
    "npm pack changed the repository worktree",
  );
} catch (error) {
  errors.push(error);
}

if (errors.length === 1) {
  throw errors[0];
}
if (errors.length > 1) {
  throw new AggregateError(errors, "Package verification failed");
}

console.info("server-act package verification passed; worktree unchanged");
