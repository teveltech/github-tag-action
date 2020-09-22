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

// test('builds major release', async () => {
//     process.env.GITHUB_SHA = "7f42496b3e66a58642227e2200e6405c07537e5d";
//     cp.execSync("git checkout 7f42496b3e66a58642227e2200e6405c07537e5d");

//     const cap = new StdoutCapture();

//     await run();

//     cap.stopCapture();

//     expect(cap.captured).toContain("set-output name=new_tag,::my-prefix-2.0.0");
// });

test('builds major release based on exclamation mark', async () => {
    process.env.GITHUB_SHA = "ca5452210e047aa2e81021db45562f0b1c85a56c";
    cp.execSync("git checkout ca5452210e047aa2e81021db45562f0b1c85a56c");

    const cap = new StdoutCapture();

    await run();

    cap.stopCapture();

    expect(cap.captured).toContain("set-output name=new_tag,::my-prefix-2.0.0");
});

// test('builds minor release', async () => {
//     process.env.GITHUB_SHA = "5b6c18f88b275b9654ea6f0448126c743133b5ff";
//     cp.execSync("git checkout 5b6c18f88b275b9654ea6f0448126c743133b5ff");

//     const cap = new StdoutCapture();

//     await run();

//     cap.stopCapture();

//     expect(cap.captured).toContain("set-output name=new_tag,::my-prefix-1.1.0");
// });

// test('builds patch release', async () => {
//     process.env.GITHUB_SHA = "8fe0159ec6ed3bb669765fbce6ed42a0b4adede5";
//     cp.execSync("git checkout 8fe0159ec6ed3bb669765fbce6ed42a0b4adede5");

//     const cap = new StdoutCapture();

//     await run();

//     cap.stopCapture();

//     expect(cap.captured).toContain("set-output name=new_tag,::my-prefix-1.0.1");
// });

// test('does not build patch release due to dry_run', async () => {
//     process.env.GITHUB_SHA = "8fe0159ec6ed3bb669765fbce6ed42a0b4adede5";
//     cp.execSync("git checkout 8fe0159ec6ed3bb669765fbce6ed42a0b4adede5");

//     process.env.INPUT_dry_run = "true";

//     const cap = new StdoutCapture();

//     await run();

//     cap.stopCapture();

//     expect(cap.captured).toContain("::set-output name=dry_run,::true");
// });

// test('builds no release due to missing keyword', async () => {
//     process.env.GITHUB_SHA = "3e039e60919e4ad573e11b508be57fb13919f330";
//     cp.execSync("git checkout 3e039e60919e4ad573e11b508be57fb13919f330");

//     const cap = new StdoutCapture();

//     await run();

//     cap.stopCapture();

//     expect(cap.captured).not.toContain("::set-output name=new_tag");
//     expect(cap.captured).toContain("::error::Nothing to bump - not building release");
// });

// test('builds release due to default_bump', async () => {
//     process.env.GITHUB_SHA = "3e039e60919e4ad573e11b508be57fb13919f330";
//     cp.execSync("git checkout 3e039e60919e4ad573e11b508be57fb13919f330");

//     process.env.INPUT_default_bump = "patch";

//     const cap = new StdoutCapture();

//     await run();

//     cap.stopCapture();

//     expect(cap.captured).toContain("set-output name=new_tag,::my-prefix-1.0.1");
// });

function prepareMockRepo() {
    if (!fs.existsSync("tmp")) {
        fs.mkdirSync("tmp");
    }

    process.chdir("tmp");

    if (!fs.existsSync("github-tag-action-mock-repo")) {
        console.log("Cloning https://github.com/hennejg/github-tag-action-mock-repo.git");
        cp.execSync("git clone https://github.com/hennejg/github-tag-action-mock-repo.git");
    }

    process.chdir("github-tag-action-mock-repo");
}
// test('wait 500 ms', async () => {
//     const start = new Date();
//     await wait(500);
//     const end = new Date();
//     var delta = Math.abs(end.getTime() - start.getTime());
//     expect(delta).toBeGreaterThan(450);
// });

// // shows how the runner will run a javascript action with env / stdout protocol
// test('test runs', () => {
//     process.env['INPUT_MILLISECONDS'] = '500';
//     const ip = path.join(__dirname, '..', 'lib', 'main.js');
//     const options: cp.ExecSyncOptions = {
//         env: process.env
//     };
//     console.log(cp.execSync(`node ${ip}`, options).toString());
// });