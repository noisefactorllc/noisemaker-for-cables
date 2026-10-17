import { execFile } from 'node:child_process'

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

// A process the child launched (the editor opens folders and links through the
// desktop) can inherit the child's stdout and stderr and outlive it, which
// keeps the parent's event loop alive. Release the pipes once the child is gone.
function releaseStdio(child) {
  for (const stream of [child.stdin, child.stdout, child.stderr]) stream?.destroy?.()
}

// On Windows child.kill() terminates only the editor's main process. Its
// Chromium helpers (GPU, renderer, utility) can outlive it and keep loading the
// runner while the next editor instance starts: in run 38221822648
// (windows-2025, Standalone 0.11.0) a retried project instance printed nothing
// for 90 s and two orphaned cables processes remained at job end. taskkill /T
// ends the whole tree while the main process still anchors it.
function taskkillTree(pid) {
  return new Promise((resolve) => {
    execFile('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true }, (error) => resolve(!error))
  })
}

export async function stopChild(
  child,
  {
    delay = sleep,
    graceMilliseconds = 3_000,
    platform = process.platform,
    killTree = taskkillTree,
  } = {},
) {
  if (child.exitCode !== null || child.signalCode != null) {
    releaseStdio(child)
    return
  }

  const exited = new Promise((resolve) => child.once('exit', resolve))
  if (platform === 'win32' && Number.isInteger(child.pid)) await killTree(child.pid)
  else child.kill('SIGTERM')
  const result = await Promise.race([
    exited.then(() => 'exited'),
    delay(graceMilliseconds).then(() => 'elapsed'),
  ])

  if (result !== 'exited') {
    if (child.exitCode === null && child.signalCode == null) child.kill('SIGKILL')
    await exited
  }
  releaseStdio(child)
}
