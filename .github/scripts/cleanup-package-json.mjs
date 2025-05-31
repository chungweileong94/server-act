import { readFileSync, writeFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

packageJson.scripts = undefined;
packageJson.devDependencies = undefined;

writeFileSync("package.json", JSON.stringify(packageJson, null, 2));
