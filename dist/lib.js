"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
const core = __importStar(require("@actions/core"));
const commit_analyzer_1 = require("@semantic-release/commit-analyzer");
const release_notes_generator_1 = require("@semantic-release/release-notes-generator");
const utils_1 = require("./utils");
const git_1 = require("./git");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
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
            const branch = GITHUB_REF.replace("refs/heads/", "");
            const preRelease = releaseBranches
                .split(",")
                .every(releaseBranch => !branch.match(releaseBranch));
            yield utils_1.exec("git fetch --tags");
            const hasTag = !!(yield utils_1.exec("git tag")).stdout.trim();
            let tag = "";
            let commits = [];
            if (hasTag) {
                console.log(yield utils_1.exec('pwd'));
                const previousTagSha = yield git_1.getPreviousTagSha(tagPrefix);
                tag = yield git_1.getTag(previousTagSha);
                commits = yield git_1.getCommits(tag);
                if (previousTagSha === GITHUB_SHA) {
                    core.debug("No new commits since previous tag. Skipping...");
                    core.setOutput("previous_tag", tag);
                    return;
                }
            }
            else {
                tag = "0.0.0";
                commits = yield git_1.getCommits();
                core.setOutput("previous_tag", tag);
            }
            console.info(`Current tag is ${tag}`);
            core.debug(`Commits: ${commits}`);
            var bump = yield commit_analyzer_1.analyzeCommits({ preset: messageParserPreset || 'conventionalcommits' }, { commits, logger: { log: console.info.bind(console) } });
            core.debug(`Bump type from commits: ${bump}`);
            bump = bump || defaultBump;
            core.info(`Effective bump type: ${bump}`);
            if (!bump) {
                core.setFailed(`Nothing to bump - not building release`);
                return;
            }
            // const rawVersion = tag.replace(tagPrefix, '');
            // const incResult = semver.inc(rawVersion, bump || defaultBump);
            // core.debug(`SemVer.inc(${rawVersion}, ${bump || defaultBump}): ${incResult}`);
            // if (!incResult) {
            //   core.setFailed(`SemVer inc rejected tag ${tag}`);
            //   return;
            // }
            // const newVersion = `${incResult}${preRelease ? `-${GITHUB_SHA.slice(0, 7)}` : ""}`;
            // const newTag = `${tagPrefix}${newVersion}`;
            const { newVersion, newTag } = yield utils_1.calculateVersion(tag, branch, bump, preRelease, defaultBump);
            core.setOutput("new_version", newVersion);
            core.setOutput("new_tag", newTag);
            core.debug(`New tag: ${newTag}`);
            const changelog = yield release_notes_generator_1.generateNotes({}, {
                commits,
                logger: { log: console.info.bind(console) },
                options: {
                    repositoryUrl: `https://github.com/${process.env.GITHUB_REPOSITORY}`
                },
                lastRelease: { gitTag: tag },
                nextRelease: { gitTag: newTag, version: newVersion }
            });
            core.setOutput("changelog", changelog);
            if (preRelease) {
                core.debug("This branch is not a release branch. Skipping the tag creation.");
                return;
            }
            if (yield git_1.checkTagExists(newTag)) {
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
                yield git_1.createTag(core.getInput("github_token"), GITHUB_SHA, newTag, true);
            }
            else {
                core.debug(`Pushing new tag to the repo`);
                yield git_1.createTag(core.getInput("github_token"), GITHUB_SHA, newTag, false);
            }
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
exports.run = run;
