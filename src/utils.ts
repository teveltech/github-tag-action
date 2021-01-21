import { exec as _exec } from "@actions/exec";

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