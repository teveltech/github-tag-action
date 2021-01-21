import { exec as _exec } from "@actions/exec";
import { format } from "prettier";
import semver, { ReleaseType } from "semver";
import { BranchePrefix } from "./types/git";
import { gitDescribe } from "./git"

export async function exec(command: string, args?: string[]) {
    let stdout = "";
    let stderr = "";
  
    try {
      const options = {
        listeners: {
          stdout: (data: Buffer) => {
            stdout += data.toString();
          },
          stderr: (data: Buffer) => {
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

export async function calculateVersion(tag: string, branch: string, bump: ReleaseType, preRelease: boolean, defaultBump: ReleaseType = "patch") {
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