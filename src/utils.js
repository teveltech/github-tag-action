const { exec:_exec } = require("@actions/exec")
const semver = require("semver");
const { gitDescribe } = require("./git");

const BranchePrefix  = {
  master:'v',
  stage: 's',
  dev: 'd'
}

async function exec(command, args) {
    let stdout = "";
    let stderr = "";
  
    try {
      const options = {
        listeners: {
          stdout: (data) => {
            stdout += data.toString();
          },
          stderr: (data) => {
            stderr += data.toString();
          }
        }
      };
  
      const code = await _exec(command, args, options);
  
      return {
        code,
        stdout,
        stderr
      };
    } catch (err) {
      return {
        code: 1,
        stdout,
        stderr,
        error: err
      };
    }
}

async function calculateVersion(tag, branch, bump, preRelease, defaultBump = "patch") {
  let newVersion = '';
  let newTag = '';
  if (preRelease) {
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

module.exports = { exec, calculateVersion }