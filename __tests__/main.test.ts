import * as process from 'process';
import * as cp from 'child_process';
import * as path from 'path';
import * as core from "@actions/core";
import { run } from "../src/lib";
import * as fs from "fs";
import intercept from 'intercept-stdout';

jest.setTimeout(30000000);
prepareMockRepo();
process.env.INPUT_tag_prefix = "my-prefix-";
process.env.INPUT_release_branches = "master";
process.env.GITHUB_REF = "refs/heads/master";

class StdoutCapture {
    captured: string;
    unhookIntercept: () => void;

    constructor() {
        this.captured = "";
        this.unhookIntercept = intercept((data: string) => {
            this.captured += data;
            return data;
        });
    }

    stopCapture() {
        this.unhookIntercept();
    }
}

test('builds major release', async () => {
    prepare("7f42496b3e66a58642227e2200e6405c07537e5d", "master");

    const cap = new StdoutCapture();

    await run();

    cap.stopCapture();

    expect(cap.captured).toContain("set-output name=new_tag,::my-prefix-2.0.0");
});

test('builds major release based on exclamation mark', async () => {
    prepare("ca5452210e047aa2e81021db45562f0b1c85a56c", "a-different-breaking-change");

    const cap = new StdoutCapture();

    await run();

    cap.stopCapture();

    expect(cap.captured).toContain("set-output name=new_tag,::my-prefix-2.0.0");
});

test('builds minor release', async () => {
    prepare("5b6c18f88b275b9654ea6f0448126c743133b5ff", null);

    const cap = new StdoutCapture();

    await run();

    cap.stopCapture();

    expect(cap.captured).toContain("set-output name=new_tag,::my-prefix-1.1.0");
});

test('builds patch release', async () => {
    prepare("8fe0159ec6ed3bb669765fbce6ed42a0b4adede5", null);

    const cap = new StdoutCapture();

    await run();

    cap.stopCapture();

    expect(cap.captured).toContain("set-output name=new_tag,::my-prefix-1.0.1");
});

test('does not build patch release due to dry_run', async () => {
    prepare("8fe0159ec6ed3bb669765fbce6ed42a0b4adede5", null);

    process.env.INPUT_dry_run = "true";

    const cap = new StdoutCapture();

    await run();

    cap.stopCapture();

    expect(cap.captured).toContain("::set-output name=dry_run,::true");
});

test('builds no release due to missing keyword', async () => {
    prepare("3e039e60919e4ad573e11b508be57fb13919f330", "a-no-release-change");

    const cap = new StdoutCapture();

    await run();

    cap.stopCapture();

    expect(cap.captured).not.toContain("::set-output name=new_tag");
    expect(cap.captured).toContain("::error::Nothing to bump - not building release");
});

test('builds release due to default_bump', async () => {
    prepare("3e039e60919e4ad573e11b508be57fb13919f330", "a-no-release-change");

    process.env.INPUT_default_bump = "patch";

    const cap = new StdoutCapture();

    await run();

    cap.stopCapture();

    expect(cap.captured).toContain("set-output name=new_tag,::my-prefix-1.0.1");
});

function prepare(rev, branch) {
    process.env.GITHUB_SHA = rev;
    if (branch) {
        cp.execSync(`git fetch origin ${branch} --depth=1`);
    }

    cp.execSync(`git checkout ${rev}`);
}

function prepareMockRepo() {
    if (!fs.existsSync("tmp")) {
        fs.mkdirSync("tmp");
    }

    process.chdir("tmp");

    const name = "github-tag-action-mock-repo";
    if (!fs.existsSync(name)) {
        console.log(`Cloning https://github.com/hennejg/${name}`);
        cp.execSync(`git init ${name}`);

        process.chdir(name);

        cp.execSync(`git remote add origin https://github.com/hennejg/${name}.git`);
        cp.execSync("git fetch origin --no-tags --prune --depth=1 --no-recurse-submodules");
    }

}