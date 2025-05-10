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
    const describe = await gitDescribe();
    const [rawTag, inc, hash] = describe.split('-');

    // Extract prefix (e.g., 'v') and clean tag number (e.g., '1.1.0')
    const prefixMatch = rawTag.match(/^[a-zA-Z]+/);
    const prefix = prefixMatch ? prefixMatch[0] : '';
    const versionPart = rawTag.replace(prefix, '');

    newVersion = `${versionPart}-${branch}-${inc}`;
    newTag = `${prefix}${newVersion}`
    // newTag =`${tag}-${branch}-${inc}-${hash}`
  } else {
    const prefix = BranchPrefix[branch] || branch[0]; // fallback to first letter
    const rawVersion = tag.replace(prefix, '');
    const incResult = semver.inc(rawVersion, bump || defaultBump);
    console.log(`SemVer.inc(${rawVersion}, ${bump || defaultBump}): ${incResult}`);
    
    if (!incResult) {
      throw new Error(`SemVer inc rejected tag ${tag}`);
    }
    newVersion = `${incResult}`
    newTag = `${prefix}${newVersion}`
  }
  
  newTag = newTag.replace(/_/g, '-');
  newVersion = newVersion.replace(/_/g, '-');
  newNumbered = newTag.indexOf("-") > 0 ? newTag.substring(0, newTag.indexOf("-")) : newTag;
  return {newVersion, newTag, newNumbered}
}

module.exports = { calculateVersion }
