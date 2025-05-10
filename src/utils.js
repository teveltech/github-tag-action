const semver = require("semver");
const { gitDescribe } = require("./git");

const BranchPrefix  = {
  master:'v',
  stage: 's',
  dev: 'd'
}



async function calculateVersion(tag, branch, bump, preRelease, defaultBump = "patch") {
  let newVersion = '';
  let newTag = '';
  if (preRelease) {
    console.log(`Prerelease on branch ${branch}`);

    // Find latest annotated or SemVer tag
    let rawTag = execOutput(`git tag --sort=-creatordate | grep -E '^v?\\d+\\.\\d+\\.\\d+$' | head -n1`);
    const versionPart = rawTag.replace(/^v/, '');

    // Get commit count since tag
    const describe = execOutput(`git describe --tags --match "v[0-9]*"`);
    const dissect = describe.split('-');
    const inc = dissect.length >= 3 ? dissect[1] : '0';

    newVersion = `${versionPart}-${branch}-${inc}`;
    newTag = `v${newVersion}`;
  } else {
    // Find latest SemVer tag and bump it
    let rawTag = execOutput(`git tag --sort=-creatordate | grep -E '^v?\\d+\\.\\d+\\.\\d+$' | head -n1`);
    const versionPart = rawTag.replace(/^v/, '');
    const incResult = semver.inc(versionPart, bump || defaultBump);

    if (!incResult) {
      throw new Error(`Could not increment SemVer from: ${versionPart}`);
    }

    newVersion = incResult;
    newTag = `v${newVersion}`;
  }

  const newNumbered = newTag.includes('-') ? newTag.split('-')[0] : newTag;
  return { newVersion, newTag, newNumbered };
}

module.exports = { calculateVersion }
