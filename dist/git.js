"use strict";
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
exports.gitDescribe = exports.createTag = exports.checkTagExists = exports.getCommits = exports.getTag = exports.getPreviousTagSha = void 0;
const utils_1 = require("./utils");
const github_1 = require("@actions/github");
const SEPARATOR = "==============================================";
function getPreviousTagSha(tagPrefix) {
    return __awaiter(this, void 0, void 0, function* () {
        return (yield utils_1.exec(`git rev-list --tags=${tagPrefix}* --topo-order --max-count=1`)).stdout.trim();
    });
}
exports.getPreviousTagSha = getPreviousTagSha;
function getTag(previousTagSha) {
    return __awaiter(this, void 0, void 0, function* () {
        return (yield utils_1.exec(`git describe --tags ${previousTagSha}`)).stdout.trim();
    });
}
exports.getTag = getTag;
function getCommits(fromTag) {
    return __awaiter(this, void 0, void 0, function* () {
        let logs = "";
        if (fromTag) {
            logs = (yield utils_1.exec(`git log ${fromTag}..HEAD --pretty=format:'%s%n%b${SEPARATOR}' --abbrev-commit`)).stdout.trim();
        }
        else {
            logs = (yield utils_1.exec(`git log --pretty=format:'%s%n%b${SEPARATOR}' --abbrev-commit`)).stdout.trim();
        }
        return logs.split(SEPARATOR)
            .map(x => ({ message: x.trim().replace(/(^['\s]+)|(['\s]+$)/g, "") }))
            .filter(x => !!x.message);
    });
}
exports.getCommits = getCommits;
function checkTagExists(tag) {
    return __awaiter(this, void 0, void 0, function* () {
        return !!(yield utils_1.exec(`git tag -l "${tag}"`)).stdout.trim();
    });
}
exports.checkTagExists = checkTagExists;
function createTag(github_token, GITHUB_SHA, tagName, annotated) {
    return __awaiter(this, void 0, void 0, function* () {
        const octokit = new github_1.GitHub(github_token);
        if (annotated) {
            console.log(`Creating annotated tag`);
            const tagCreateResponse = yield octokit.git.createTag(Object.assign(Object.assign({}, github_1.context.repo), { tag: tagName, message: tagName, object: GITHUB_SHA, type: "commit" }));
            console.log(`Pushing annotated tag to the repo`);
            yield octokit.git.createRef(Object.assign(Object.assign({}, github_1.context.repo), { ref: `refs/tags/${tagName}`, sha: tagCreateResponse.data.sha }));
            return;
        }
        else {
            console.log(`Pushing new lightweight tag to the repo`);
            yield octokit.git.createRef(Object.assign(Object.assign({}, github_1.context.repo), { ref: `refs/tags/${tagName}`, sha: GITHUB_SHA }));
        }
    });
}
exports.createTag = createTag;
function gitDescribe() {
    return __awaiter(this, void 0, void 0, function* () {
        return (yield utils_1.exec(`git describe --tags`)).stdout.trim();
    });
}
exports.gitDescribe = gitDescribe;
