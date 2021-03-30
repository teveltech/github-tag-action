const core = require('@actions/core');
const { analyzeCommits } = require("@semantic-release/commit-analyzer");
const { generateNotes } = require("@semantic-release/release-notes-generator");
const utils = require('./src/utils');
const { getPreviousTagSha, getTag, getCommits, checkTagExists, createTag, fetchTags } = require('./src/git');

async function run() {
  try {
    const defaultBump = core.getInput("default_bump");
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

    const branch = GITHUB_REF.replace("refs/heads/", "")
    core.info(`Triggered on branch ${branch}`)

    const preRelease = releaseBranches
      .split(",")
      .every(releaseBranch => !branch.match(releaseBranch));

    core.info(`Pre release branch: ${preRelease}`)
    core.setOutput('preRelease', preRelease);

    const hasTag = !!(await fetchTags()).stdout.trim();
    let tag = "";
    let commits = [];

    if (hasTag) {
      const previousTagSha = await getPreviousTagSha(tagPrefix);
      tag = await getTag(previousTagSha);
      commits = await getCommits(tag);

      if (previousTagSha === GITHUB_SHA) {
        core.warning("No new commits since previous tag. Skipping version update");
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
      // { preset: messageParserPreset || 'conventionalcommits' },
      {}, // dynamic imports of semantic release plugins is not supported with ncc bundler
      { commits, logger: { log: console.info.bind(console) } }
    );
    core.debug(`Bump type from commits: ${bump}`);

    bump = bump || defaultBump;

    core.info(`Effective bump type: ${bump}`);
    const {newVersion, newTag} = await utils.calculateVersion(tag, branch, bump, preRelease, defaultBump)
    
    core.debug(`New version: ${newVersion}, New Tag: ${newTag}`)

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

    if (await checkTagExists(newTag)) {
      core.warning("This tag already exists. Skipping the tag creation.");
      return;
    }

    core.info("dry_run: " + dryRun + " (" + typeof (dryRun) + ")");
    if (dryRun === "true") {
      core.setOutput("dry_run", "true");
      core.info("Dry run: not performing tag action.");
      return;
    }
    
    core.info("preRelease: " + preRelease + ". createAnnotatedTag" + createAnnotatedTag);
    if (preRelease != "true" && createAnnotatedTag != "false") {
      core.debug(
        "This branch is a release branch and no explicit createAnnotatedTag detected. Creating annotated tag."
      );
      createAnnotatedTag = "true";
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

run()
