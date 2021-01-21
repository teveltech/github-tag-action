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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateVersion = exports.exec = void 0;
const exec_1 = require("@actions/exec");
const semver_1 = __importDefault(require("semver"));
const git_1 = require("./types/git");
const git_2 = require("./git");
function exec(command, args) {
    return __awaiter(this, void 0, void 0, function* () {
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
            const code = yield exec_1.exec(command, args, options);
            return {
                code,
                stdout,
                stderr
            };
        }
        catch (err) {
            return {
                code: 1,
                stdout,
                stderr,
                error: err
            };
        }
    });
}
exports.exec = exec;
function calculateVersion(tag, branch, bump, preRelease, defaultBump = "patch") {
    return __awaiter(this, void 0, void 0, function* () {
        let newVersion = '';
        let newTag = '';
        if (preRelease) {
            const describe = yield git_2.gitDescribe();
            const dissect = describe.split('-');
            const tag = dissect[0];
            const inc = dissect[1];
            const hash = dissect[2];
            newTag = `${tag}-${branch}-${inc}-${hash}`;
        }
        else {
            let prefix = (git_1.BranchePrefix[branch]) ? git_1.BranchePrefix[branch] : branch[0];
            const rawVersion = tag.replace(prefix, '');
            const incResult = semver_1.default.inc(rawVersion, bump || defaultBump);
            console.log(`SemVer.inc(${rawVersion}, ${bump || defaultBump}): ${incResult}`);
            if (!incResult) {
                throw new Error("`SemVer inc rejected tag ${tag}`");
            }
            newVersion = `${incResult}`;
            newTag = `${prefix}${newVersion}`;
        }
        return { newVersion, newTag };
    });
}
exports.calculateVersion = calculateVersion;
