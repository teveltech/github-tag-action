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
    const dissect = describe.split('-');
    let tag = dissect[0];
    const inc = dissect[1];
    const hash = dissect[2];
    console.log(`here`)
    const bumpedVersion = semver.inc(tag, bump || defaultBump);
    if (!bumpedVersion) {
      throw new Error(`Could not bump SemVer for prerelease from: ${tag}`);
    }
    let prefix = tag.replace(tag.replace(/[a-zA-Z]+/, ''), '')
    tag = tag.replace(/[a-zA-Z]+/, '')
    

    console.log(`${bump}`)
    console.log(`${bumpedVersion}`)
    newVersion = `${bumpedVersion}-${branch}-${inc}`;
    newTag = `${prefix}${newVersion}`
    // newTag =`${tag}-${branch}-${inc}-${hash}`
  } else {
    let prefix = (BranchPrefix[branch]) ? BranchPrefix[branch] : branch[0];
    
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