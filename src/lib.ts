import * as core from "@actions/core";
import semver, { ReleaseType } from "semver";
import { analyzeCommits } from "@semantic-release/commit-analyzer";
import { generateNotes } from "@semantic-release/release-notes-generator";
import { exec } from './utils';
import { getPreviousTagSha, getTag, getCommits, checkTagExists, createTag } from './git';
import { Commit } from "./types/git";


export async function run() {
  try {
    const defaultBump = core.getInput("default_bump") as ReleaseType;
    const messageParserPreset = core.getInput("message_parser_preset");
    const tagPrefix = core.getInput("tag_prefix");
    const releaseBranches = core.getInput("release_branches");
    const createAnnotatedTag = core.getInput("create_annotated_tag");
    const dryRun = core.getInput("dry_run");

    const { GITHUB_REF, GITHUB_SHA } = process.env;

    if (!GITHUB_REF) {
      core.setFailed("Missing GITHUB_REF");
      return;
    }

    if (!GITHUB_SHA) {
      core.setFailed("Missing GITHUB_SHA");
      return;
    }

    const preRelease = releaseBranches
      .split(",")
      .every(branch => !GITHUB_REF.replace("refs/heads/", "").match(branch));

    await exec("git fetch --tags");

    const hasTag = !!(await exec("git tag")).stdout.trim();
    let tag = "";
    let commits: Array<Commit> = [];

    if (hasTag) {
      console.log(await exec('pwd'));
      const previousTagSha = await getPreviousTagSha(tagPrefix);
      tag = await getTag(previousTagSha);
      commits = await getCommits(tag);

      if (previousTagSha === GITHUB_SHA) {
        core.debug("No new commits since previous tag. Skipping...");
        core.setOutput("previous_tag", tag);
        return;
      }
    } else {
      tag = "0.0.0";
      commits = await getCommits();
      core.setOutput("previous_tag", tag);
    }

    console.info(`Current tag is ${tag}`);

    core.debug(`Commits: ${commits}`);

    var bump = await analyzeCommits(
      { preset: messageParserPreset || 'conventionalcommits' },
      { commits, logger: { log: console.info.bind(console) } }
    ) as ReleaseType;
    core.debug(`Bump type from commits: ${bump}`);

    bump = bump || defaultBump;

    core.info(`Effective bump type: ${bump}`);

    if (!bump) {
      core.setFailed(`Nothing to bump - not building release`);
      return;
    }

    const rawVersion = tag.replace(tagPrefix, '');
    const incResult = semver.inc(rawVersion, bump || defaultBump);
    core.debug(`SemVer.inc(${rawVersion}, ${bump || defaultBump}): ${incResult}`);
    if (!incResult) {
      core.setFailed(`SemVer inc rejected tag ${tag}`);
      return;
    }

    const newVersion = `${incResult}${preRelease ? `-${GITHUB_SHA.slice(0, 7)}` : ""}`;
    const newTag = `${tagPrefix}${newVersion}`;

    core.setOutput("new_version", newVersion);
    core.setOutput("new_tag", newTag);

    core.debug(`New tag: ${newTag}`);

    const changelog = await generateNotes(
      {},
      {
        commits,
        logger: { log: console.info.bind(console) },
        options: {
          repositoryUrl: `https://github.com/${process.env.GITHUB_REPOSITORY}`
        },
        lastRelease: { gitTag: tag },
        nextRelease: { gitTag: newTag, version: newVersion }
      }
    );

    core.setOutput("changelog", changelog);

    if (preRelease) {
      core.debug(
        "This branch is not a release branch. Skipping the tag creation."
      );
      return;
    }

    if (await checkTagExists(newTag)) {
      core.debug("This tag already exists. Skipping the tag creation.");
      return;
    }

    core.info("dry_run: " + dryRun + " (" + typeof (dryRun) + ")");
    if (dryRun === "true") {
      core.setOutput("dry_run", "true");
      core.info("Dry run: not performing tag action.");
      return;
    }

    if (createAnnotatedTag === "true") {
      core.debug(`Creating annotated tag`);
      await createTag(core.getInput("github_token"), GITHUB_SHA, newTag, true)
    } else {
      core.debug(`Pushing new tag to the repo`);
      await createTag(core.getInput("github_token"), GITHUB_SHA, newTag, false)
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}
