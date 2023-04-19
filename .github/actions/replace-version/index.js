const fs = require("fs");
const core = require("@actions/core");

function mergeVersions(fileData, inputVersions) {
  let mergedVersions = JSON.parse(JSON.stringify(fileData));

  for (const key in inputVersions) {
    if (inputVersions[key] === null) continue;

    if (typeof inputVersions[key] === "object") {
      for (const innerKey in inputVersions[key]) {
        if (inputVersions[key][innerKey] !== null) {
          mergedVersions[key][innerKey] = inputVersions[key][innerKey];
        }
      }
    } else {
      mergedVersions[key] = inputVersions[key];
    }
  }

  return mergedVersions;
}

(async () => {
  try {
    const fileData = JSON.parse(fs.readFileSync("src/versions.json", "utf8"));
    const versionsInput = core.getInput("versions");
    const inputVersions = JSON.parse(versionsInput);

    const mergedVersions = mergeVersions(fileData, inputVersions);

    let shouldSetCargoRegistryDefault = false;
    if (inputVersions.cargo) {
      for (const key in inputVersions.cargo) {
        if (inputVersions.cargo[key] !== null) {
          shouldSetCargoRegistryDefault = true;
          break;
        }
      }
    }

    fs.writeFileSync(
      "src/versions.json",
      JSON.stringify(mergedVersions, null, 2)
    );

    if (shouldSetCargoRegistryDefault) {
      core.exportVariable("CARGO_REGISTRY_DEFAULT", "fluence");
    }
  } catch (error) {
    core.setFailed(error.message);
  }
})();
