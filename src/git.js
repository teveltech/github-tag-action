const { context, GitHub } = require("@actions/github");
const { exec:_exec } = require("@actions/exec")

const SEPARATOR = "==============================================";

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

async function getPreviousTagSha(tagPrefix) {
    return (await exec(`git rev-list --tags=${tagPrefix}* --topo-order --max-count=1`)).stdout.trim()
}

async function getTag(previousTagSha) {
    return (await exec(`git describe ${previousTagSha}`)).stdout.trim()
}

async function fetchTags(){
    await exec("git fetch --tags");
    return await exec("git tag")
}

async function getCommits(fromTag) {
    let logs = ""
    if(fromTag){
        logs = (await exec(`git log ${fromTag}..HEAD --pretty=format:%s%n%b${SEPARATOR} --abbrev-commit`)).stdout.trim();
    } else {
        logs = (await exec(`git log --pretty=format:%s%n%b${SEPARATOR} --abbrev-commit`)).stdout.trim();
    }
    logs += '\n';
    return logs.split(SEPARATOR)
      .map(x => ({ message: x.trim().replace(/(^['\s]+)|(['\s]+$)/g, "") }))
      .filter(x => !!x.message);
}

async function checkTagExists(tag) {
    return !!(await exec(`git tag -l "${tag}"`)).stdout.trim();
}

async function createTag(github_token, GITHUB_SHA, tagName, annotated) {
    const octokit = new GitHub(github_token);
    if(annotated){
        console.log(`Creating annotated tag`);

        const tagCreateResponse = await octokit.git.createTag({
            ...context.repo,
            tag: tagName,
            message: tagName,
            object: GITHUB_SHA,
            type: "commit"
        });

        console.log(`Pushing annotated tag to the repo`);

        await octokit.git.createRef({
            ...context.repo,
            ref: `refs/tags/${tagName}`,
            sha: tagCreateResponse.data.sha
        });
        return;
    } else {
        console.log(`Pushing new lightweight tag to the repo`);

        await octokit.git.createRef({
            ...context.repo,
            ref: `refs/tags/${tagName}`,
            sha: GITHUB_SHA
        });
    }
}

async function gitDescribe() {
    return (await exec(`git describe`)).stdout.trim();
}

module.exports = {
    createTag,
    checkTagExists,
    getCommits,
    getTag,
    fetchTags,
    getPreviousTagSha,
    gitDescribe
}
