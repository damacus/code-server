import { spawn } from "child_process"

type FixMeLater = any

type CSCmd =
  | {
      code: number | null
      signal: NodeJS.Signals | null
      stdout: string
      stderr: string
    }
  | FixMeLater

async function runCodeServerCommand(argv: string[], options: FixMeLater): Promise<CSCmd> {
  const CODE_SERVER_COMMAND = process.env.CS_PATH || "/var/tmp/coder/code-server/bin/code-server"
  // Credit: https://github.com/vercel/next.js/blob/canary/test/lib/next-test-utils.js#L139
  return new Promise((resolve, reject) => {
    console.log(`Running command "${CODE_SERVER_COMMAND} ${argv.join(" ")}"`)
    const instance = spawn(CODE_SERVER_COMMAND, [...argv])
    let mergedStdio = ""

    let stderrOutput = ""
    if (options.stderr) {
      instance.stderr.on("data", function (chunk) {
        mergedStdio += chunk
        stderrOutput += chunk

        if (options.stderr === "log") {
          console.log(chunk.toString())
        }
      })
    } else {
      instance.stderr.on("data", function (chunk) {
        mergedStdio += chunk
      })
    }

    let stdoutOutput = ""
    if (options.stdout) {
      instance.stdout.on("data", function (chunk) {
        mergedStdio += chunk
        stdoutOutput += chunk

        if (options.stdout === "log") {
          console.log(chunk.toString())
        }
      })
    } else {
      instance.stdout.on("data", function (chunk) {
        mergedStdio += chunk
      })
    }

    instance.on("close", (code, signal) => {
      if (!options.stderr && !options.stdout && !options.ignoreFail && code !== 0) {
        return reject(new Error(`command failed with code ${code}\n${mergedStdio}`))
      }

      resolve({
        code,
        signal,
        stdout: stdoutOutput,
        stderr: stderrOutput,
      })
    })

    instance.on("error", (err: FixMeLater) => {
      err.stdout = stdoutOutput
      err.stderr = stderrOutput
      reject(err)
    })
  })
}

describe("--install-extension", () => {
  it("should install an extension", async () => {
    const cmd = "--install-extension"
    const args = ["wesbos.theme-cobalt2"]
    await runCodeServerCommand([cmd, ...args], {})
    const { stdout } = await runCodeServerCommand(["--list-extensions"], { stdout: true })
    expect(stdout).toContain("wesbos.theme-cobalt2")
  })
})
