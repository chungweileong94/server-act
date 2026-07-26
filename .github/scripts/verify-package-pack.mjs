import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const packageDir = join(repoRoot, "packages/server-act");
const packageManifestPath = join(packageDir, "package.json");
const exampleManifestPath = join(repoRoot, "examples/nextjs/package.json");
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
const expectedExports = {
  ".": {
    import: {
      types: "./dist/index.d.mts",
      default: "./dist/index.mjs",
    },
    require: {
      types: "./dist/index.d.cts",
      default: "./dist/index.cjs",
    },
  },
  "./utils": {
    import: {
      types: "./dist/utils.d.mts",
      default: "./dist/utils.mjs",
    },
    require: {
      types: "./dist/utils.d.cts",
      default: "./dist/utils.cjs",
    },
  },
};

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
const exampleManifest = JSON.parse(readFileSync(exampleManifestPath, "utf8"));
const typescriptVersion = exampleManifest.devDependencies?.typescript;
assert.equal(
  typeof typescriptVersion,
  "string",
  "examples/nextjs must declare a TypeScript development dependency",
);
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

  const tarballPath = join(tempDir, tarballs[0]);
  const consumerDir = join(tempDir, "consumer");
  mkdirSync(consumerDir);
  writeFileSync(
    join(consumerDir, "package.json"),
    `${JSON.stringify(
      {
        name: "server-act-package-smoke",
        private: true,
        type: "module",
        dependencies: {
          "server-act": pathToFileURL(tarballPath).href,
        },
        devDependencies: {
          typescript: typescriptVersion,
        },
      },
      null,
      2,
    )}\n`,
  );

  execFileSync(
    npmCommand,
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--package-lock=false",
      "--prefer-offline",
    ],
    {
      cwd: consumerDir,
      env: {
        ...process.env,
        npm_config_cache: join(tempDir, "npm-cache"),
      },
      stdio: "inherit",
    },
  );

  const installedManifest = JSON.parse(
    readFileSync(
      join(consumerDir, "node_modules/server-act/package.json"),
      "utf8",
    ),
  );
  assert.equal(installedManifest.name, sourceManifest.name);
  assert.equal(installedManifest.version, sourceManifest.version);
  assert.equal(
    installedManifest.dependencies?.["@standard-schema/spec"],
    sourceManifest.dependencies["@standard-schema/spec"],
  );
  assert.equal(
    installedManifest.dependencies?.["@standard-schema/utils"],
    sourceManifest.dependencies["@standard-schema/utils"],
  );
  assert.deepEqual(installedManifest.exports["."], expectedExports["."]);
  assert.deepEqual(
    installedManifest.exports["./utils"],
    expectedExports["./utils"],
  );
  assert.equal(
    installedManifest.scripts?.prepack,
    undefined,
    "installed package must not contain a prepack lifecycle",
  );

  writeFileSync(
    join(consumerDir, "smoke.mjs"),
    `import assert from "node:assert/strict";
import { createServerActMiddleware, serverAct } from "server-act";
import { formDataToObject } from "server-act/utils";

assert.equal(typeof serverAct, "object");
assert.equal(typeof createServerActMiddleware, "function");
assert.equal(typeof formDataToObject, "function");

const middleware = createServerActMiddleware(({ next }) =>
  next({ ctx: { mode: "esm" } }),
);
const action = serverAct
  .use(middleware)
  .action(async ({ ctx }) => ctx.mode);
assert.equal(await action(), "esm");

const formData = new FormData();
formData.set("name", "Ada");
assert.deepEqual(formDataToObject(formData), { name: "Ada" });
`,
  );
  execFileSync(process.execPath, ["smoke.mjs"], {
    cwd: consumerDir,
    stdio: "inherit",
  });
  console.info("ESM root + utils runtime");

  writeFileSync(
    join(consumerDir, "smoke.cjs"),
    `const assert = require("node:assert/strict");
const { createServerActMiddleware, serverAct } = require("server-act");
const { formDataToObject } = require("server-act/utils");

async function main() {
  assert.equal(typeof serverAct, "object");
  assert.equal(typeof createServerActMiddleware, "function");
  assert.equal(typeof formDataToObject, "function");

  const middleware = createServerActMiddleware(({ next }) =>
    next({ ctx: { mode: "cjs" } }),
  );
  const action = serverAct
    .use(middleware)
    .action(async ({ ctx }) => ctx.mode);
  assert.equal(await action(), "cjs");

  const formData = new FormData();
  formData.set("name", "Grace");
  assert.deepEqual(formDataToObject(formData), { name: "Grace" });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
`,
  );
  execFileSync(process.execPath, ["smoke.cjs"], {
    cwd: consumerDir,
    stdio: "inherit",
  });
  console.info("CJS root + utils runtime");

  const typeConsumer = `import {
  createServerActMiddleware,
  serverAct,
  type InputErrors,
} from "server-act";
import { formDataToObject } from "server-act/utils";

const middleware = createServerActMiddleware(({ next }) =>
  next({ ctx: { requestId: "request-1" } }),
);
const action = serverAct
  .use(middleware)
  .action(async ({ ctx }) => ctx.requestId);
const actionResult: Promise<string> = action();
const parsed: Record<string, unknown> = formDataToObject(new FormData());
const inputErrors: InputErrors<{ name: string }> = {
  messages: [],
  fieldErrors: { name: ["Required"] },
};

void actionResult;
void parsed;
void inputErrors;
`;
  writeFileSync(join(consumerDir, "consumer.mts"), typeConsumer);
  writeFileSync(join(consumerDir, "consumer.cts"), typeConsumer);
  writeFileSync(
    join(consumerDir, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          strict: true,
          noEmit: true,
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          skipLibCheck: false,
          types: [],
        },
        include: ["consumer.mts", "consumer.cts"],
      },
      null,
      2,
    )}\n`,
  );
  execFileSync(
    process.execPath,
    [
      join(consumerDir, "node_modules/typescript/bin/tsc"),
      "--project",
      "tsconfig.json",
    ],
    {
      cwd: consumerDir,
      stdio: "inherit",
    },
  );
  console.info("NodeNext .d.mts + .d.cts declarations");
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
