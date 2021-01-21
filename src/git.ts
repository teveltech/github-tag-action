import { exec } from './utils'
import { Commit } from './types/git'
import { context, GitHub } from "@actions/github";

const SEPARATOR = "==============================================";

export async function getPreviousTagSha(tagPrefix: string) {
    return (await exec(`git rev-list --tags=${tagPrefix}* --topo-order --max-count=1`)).stdout.trim()
}

export async function getTag(previousTagSha: string) {
    return (await exec(`git describe --tags ${previousTagSha}`)).stdout.trim()
}

export async function getCommits(fromTag?: string) : Promise<Array<Commit>>{
    let logs = ""
    if(fromTag){
        logs = (await exec(`git log ${fromTag}..HEAD --pretty=format:'%s%n%b${SEPARATOR}' --abbrev-commit`)).stdout.trim();
    } else {
        logs = (await exec(`git log --pretty=format:'%s%n%b${SEPARATOR}' --abbrev-commit`)).stdout.trim();
    }

    return logs.split(SEPARATOR)
      .map(x => ({ message: x.trim().replace(/(^['\s]+)|(['\s]+$)/g, "") }))
      .filter(x => !!x.message);
}

export async function checkTagExists(tag: string): Promise<Boolean> {
    return !!(await exec(`git tag -l "${tag}"`)).stdout.trim();
}

export async function createTag(github_token: string, GITHUB_SHA: string, tagName: string, annotated?: boolean) {
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