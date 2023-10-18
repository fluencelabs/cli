// @ts-check
import { exportVariable, getInput, setFailed } from "@actions/core";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import assert from "assert";

try {
  const inputVersions = JSON.parse(getInput("versions"));
  assert(typeof inputVersions === "object" && inputVersions !== null);

  assert(
    typeof process.env.GITHUB_WORKSPACE === "string",
    "GITHUB_WORKSPACE environment variable is not set",
  );

  const versionsFilePath = join(
    process.env.GITHUB_WORKSPACE,
    "src",
    "versions.json",
  );

  const versionsFileContent = readFileSync(versionsFilePath, "utf-8");
  const versions = JSON.parse(versionsFileContent);
  assert(typeof versions === "object" && versions !== null);

  let cargoDependencyUpdated = false;

  // Merge inputVersions into versions
  for (const category in inputVersions) {
    if (
      !versions.hasOwnProperty(category) || inputVersions[category] === null
    ) {
      continue;
    }

    const inputCategoryValue = inputVersions[category];
    if (
      typeof inputCategoryValue === "string" ||
      typeof inputCategoryValue === "number"
    ) {
      if (inputCategoryValue !== "null") { // ignore "null" strings
        versions[category] = inputCategoryValue;
      }
    } else if (typeof inputCategoryValue === "object") {
      for (const component in inputCategoryValue) {
        if (
          !versions[category].hasOwnProperty(component) ||
          inputVersions[category][component] === null ||
          inputVersions[category][component] === "null" // ignore "null" strings
        ) {
          continue;
        }

        versions[category][component] = inputVersions[category][component];

        // Check if a cargo dependency was updated
        if (category === "cargo") {
          cargoDependencyUpdated = true;
        }
      }
    }
  }

  const newVersionsJSONString = JSON.stringify(versions, null, 2);

  // Save updated versions.json
  writeFileSync(versionsFilePath, newVersionsJSONString);

  // Print updated versions.json to stdout
  console.log(`Updated versions.json:\n${newVersionsJSONString}`);

  // Set CARGO_REGISTRY_DEFAULT if cargoDependencyUpdated is true
  if (cargoDependencyUpdated) {
    exportVariable("CARGO_REGISTRY_DEFAULT", "fluence");
  }
} catch (error) {
  setFailed(error.message);
}
