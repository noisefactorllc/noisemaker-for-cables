export class FakeCanvas {
  constructor() {
    this.listeners = new Map()
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())
    this.listeners.get(type).add(listener)
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener)
  }

  listenerCount(type) {
    return this.listeners.get(type)?.size ?? 0
  }

  dispatch(type, event = {}) {
    for (const listener of this.listeners.get(type) ?? []) listener(event)
    return event
  }
}

export class FakePort {
  constructor(op, { choices, defaultValue, direction, kind, name }) {
    this.op = op
    this.choices = choices
    this.direction = direction
    this.kind = kind
    this.name = name
    this.value = defaultValue
    this.uiAttribs = {}
    this.onChange = null
    this.onTriggered = null
    this.changeListeners = []
  }

  get() {
    return this.value
  }

  set(value) {
    this.value = value
    this.op.events.push({ direction: this.direction, name: this.name, type: 'set', value })
    if (this.direction === 'input') {
      this.onChange?.(value, this)
      for (const listener of this.changeListeners) listener(value, this)
    }
  }

  setRef(value) {
    this.value = value
    this.op.events.push({ direction: this.direction, name: this.name, type: 'setRef', value })
  }

  setUiAttribs(attributes) {
    Object.assign(this.uiAttribs, attributes)
  }

  on(event, listener) {
    if (event === 'change') this.changeListeners.push(listener)
  }

  fire() {
    return this.onTriggered?.()
  }

  trigger() {
    this.op.events.push({ direction: this.direction, name: this.name, type: 'trigger' })
  }
}

export function createFakeCGLNamespace() {
  class Texture {
    static FILTER_NEAREST = 0
    static WRAP_CLAMP_TO_EDGE = 2
    static PFORMATSTR_RGBA16F = 'RGBA 16bit float'

    constructor(cgl, options) {
      this.cgl = cgl
      this.options = options
      this.tex = { label: options.name }
      this.width = options.width
      this.height = options.height
      this.disposeCalls = 0
    }

    dispose() {
      this.disposeCalls += 1
      return null
    }
  }

  return { Texture }
}

export function createFakeCablesOp({ canvasHeight = 360, canvasWidth = 640 } = {}) {
  const canvas = new FakeCanvas()
  const cgl = {
    canvas,
    canvasHeight,
    canvasWidth,
    gl: { canvas },
  }
  const op = {
    events: [],
    inputs: [],
    outputs: [],
    patch: { cgl },
    uiErrors: new Map(),
    workPorts: [],
    onDelete: null,
    setUiError(id, message) {
      this.uiErrors.set(id, message)
      this.events.push({ id, message, type: 'uiError' })
    },
    toWorkPortsNeedToBeLinked(...ports) {
      this.workPorts.push(...ports)
    },
  }

  const addPort = (direction, kind, name, defaultValue, choices) => {
    const port = new FakePort(op, { choices, defaultValue, direction, kind, name })
    op[direction === 'input' ? 'inputs' : 'outputs'].push(port)
    return port
  }

  op.inTrigger = (name, options) => {
    const port = addPort('input', 'trigger', name)
    port.creationOptions = options
    return port
  }
  op.inStringEditor = (name, defaultValue = '') =>
    addPort('input', 'string-editor', name, defaultValue)
  op.inTexture = (name, defaultValue = null) =>
    addPort('input', 'texture', name, defaultValue)
  op.inObject = (name, defaultValue = null, objType) => {
    const port = addPort('input', 'object', name, defaultValue)
    port.objType = objType
    return port
  }
  op.inSwitch = (name, choices, defaultValue) =>
    addPort('input', 'switch', name, defaultValue, choices)
  op.inValueInt = (name, defaultValue = 0) =>
    addPort('input', 'integer', name, defaultValue)
  op.inFloat = (name, defaultValue = 0) =>
    addPort('input', 'number', name, defaultValue)

  op.outTexture = (name) => addPort('output', 'texture', name, null)
  op.outTrigger = (name) => addPort('output', 'trigger', name)
  op.outBool = (name, defaultValue = false) =>
    addPort('output', 'boolean', name, defaultValue)
  op.outString = (name, defaultValue = '') =>
    addPort('output', 'string', name, defaultValue)

  op.input = (name) => op.inputs.find((port) => port.name === name)
  op.output = (name) => op.outputs.find((port) => port.name === name)

  return { canvas, cgl, op }
}

export function createManualScheduler() {
  const pending = []
  return {
    schedule(callback) {
      pending.push(callback)
    },
    get pendingCount() {
      return pending.length
    },
    flush() {
      while (pending.length > 0) pending.shift()()
    },
  }
}

export function deferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

export async function flushPromises() {
  await Promise.resolve()
  await Promise.resolve()
}
