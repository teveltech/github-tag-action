const semver = require("semver");
const { gitDescribe } = require("./git");

const BranchePrefix  = {
  master:'v',
  stage: 's',
  dev: 'd'
}



async function calculateVersion(tag, branch, bump, preRelease, defaultBump = "patch") {
  let newVersion = '';
  let newTag = '';
  if (preRelease) {
    console.log(`Prerelease on branch ${branch}`)
    const describe = await gitDescribe();
    const dissect = describe.split('-');
    const tag = dissect[0];
    const inc = dissect[1];
    const hash = dissect[2];
    newTag =`${tag}-${branch}-${inc}-${hash}`
  } else {
    let prefix = (BranchePrefix[branch]) ? BranchePrefix[branch] : branch[0];

    const rawVersion = tag.replace(prefix, '');
    const incResult = semver.inc(rawVersion, bump || defaultBump);

    console.log(`SemVer.inc(${rawVersion}, ${bump || defaultBump}): ${incResult}`);

    if (!incResult) {
      throw new Error("`SemVer inc rejected tag ${tag}`");
    }
    newVersion = `${incResult}`
    newTag = `${prefix}${newVersion}`
  }

  return {newVersion, newTag}
}

module.exports = { calculateVersion }