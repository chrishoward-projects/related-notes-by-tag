import { readFileSync, writeFileSync } from "fs";

// Get the next version from command line argument
const nextVersion = process.argv[2];

if (!nextVersion) {
  console.log("Usage: node prepare-changelog.mjs <version>");
  console.log("Example: node prepare-changelog.mjs 0.3.0");
  process.exit(1);
}

// Read current changelog
let changelog = readFileSync("CHANGELOG.md", "utf8");

// Find the position after the header where we should insert the new version
const headerEnd = changelog.indexOf("## [0.2.0]");
if (headerEnd === -1) {
  console.error("Could not find the insertion point in CHANGELOG.md");
  process.exit(1);
}

// Create the new version template
const newVersionTemplate = `## [${nextVersion}] - 2025-01-XX

### Added
- 

### Changed
- 

### Fixed
- 

`;

// Insert the new version template
const updatedChangelog = changelog.slice(0, headerEnd) + newVersionTemplate + changelog.slice(headerEnd);

writeFileSync("CHANGELOG.md", updatedChangelog);

console.log(`✅ Added changelog template for version ${nextVersion}`);
console.log("📝 Please update the changelog with your changes before releasing!");