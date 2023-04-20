const core = require("@actions/core");
const fs = require("fs");
const path = require("path");

async function run() {
  try {
    const inputVersions = JSON.parse(core.getInput("versions"));

    const versionsFilePath = path.join(
      process.env.GITHUB_WORKSPACE,
      "src",
      "src/versions.json"
    );
    const versionsFileContent = fs.readFileSync(versionsFilePath, "utf-8");
    const versions = JSON.parse(versionsFileContent);

    let cargoDependencyUpdated = false;

    // Merge inputVersions into versions
    for (const category in inputVersions) {
      if (
        versions.hasOwnProperty(category) &&
        inputVersions[category] != null
      ) {
        for (const component in inputVersions[category]) {
          if (
            versions[category].hasOwnProperty(component) &&
            inputVersions[category][component] !== "null"
          ) {
            versions[category][component] = inputVersions[category][component];

            // Check if a cargo dependency was updated
            if (category === "cargo") {
              cargoDependencyUpdated = true;
            }
          }
        }
      }
    }

    // Save updated versions.json
    fs.writeFileSync(versionsFilePath, JSON.stringify(versions, null, 2));

    // Print updated versions.json to stdout
    console.log("Updated versions.json:");
    console.log(JSON.stringify(versions, null, 2));

    // Set CARGO_REGISTRY_DEFAULT if cargoDependencyUpdated is true
    if (cargoDependencyUpdated) {
      core.exportVariable("CARGO_REGISTRY_DEFAULT", "fluence");
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
