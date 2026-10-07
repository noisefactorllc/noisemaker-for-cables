const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

// A process the child launched (the editor opens folders and links through the
// desktop) can inherit the child's stdout and stderr and outlive it, which
// keeps the parent's event loop alive. Release the pipes once the child is gone.
function releaseStdio(child) {
  for (const stream of [child.stdin, child.stdout, child.stderr]) stream?.destroy?.()
}

export async function stopChild(
  child,
  { delay = sleep, graceMilliseconds = 3_000 } = {},
) {
  if (child.exitCode !== null || child.signalCode != null) {
    releaseStdio(child)
    return
  }

  const exited = new Promise((resolve) => child.once('exit', resolve))
  child.kill('SIGTERM')
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
