const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

export async function stopChild(
  child,
  { delay = sleep, graceMilliseconds = 3_000 } = {},
) {
  if (child.exitCode !== null) return

  const exited = new Promise((resolve) => child.once('exit', resolve))
  child.kill('SIGTERM')
  const result = await Promise.race([
    exited.then(() => 'exited'),
    delay(graceMilliseconds).then(() => 'elapsed'),
  ])

  if (result === 'exited') return
  if (child.exitCode === null) child.kill('SIGKILL')
  await exited
}
