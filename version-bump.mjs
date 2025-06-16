import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

const targetVersion = process.env.npm_package_version;

// read minAppVersion from manifest.json and bump version to target version
let manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

// update versions.json with target version and minAppVersion
let versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));

// update changelog with release date
const today = new Date().toISOString().split('T')[0];
let changelog = readFileSync("CHANGELOG.md", "utf8");
changelog = changelog.replace(
	`## [${targetVersion}] - 2025-01-XX`,
	`## [${targetVersion}] - ${today}`
);
writeFileSync("CHANGELOG.md", changelog);

// run build to ensure main.js is updated
console.log("Building plugin...");
try {
	execSync("npm run build", { stdio: "inherit" });
	console.log("Build completed successfully");
} catch (error) {
	console.error("Build failed:", error.message);
	process.exit(1);
}