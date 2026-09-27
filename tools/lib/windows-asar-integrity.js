import { open } from 'node:fs/promises'

// Read Electron's INTEGRITY/ELECTRONASAR PE resource without executing the app.
// Only PE32+ x64 is needed for the declared Cables Windows distributions.
export async function readWindowsAsarIntegrity(executablePath) {
  const file = await open(executablePath, 'r')
  try {
    const { size } = await file.stat()
    async function read(length, offset) {
      if (length <= 0 || length > 16 * 1024 * 1024 || offset < 0 || offset + length > size) {
        throw new Error('Windows PE resource bounds are invalid')
      }
      const bytes = Buffer.alloc(length)
      if ((await file.read(bytes, 0, length, offset)).bytesRead !== length) {
        throw new Error('Windows PE resource is truncated')
      }
      return bytes
    }
    const dos = await read(64, 0)
    if (dos.toString('ascii', 0, 2) !== 'MZ') throw new Error('Windows executable lacks MZ header')
    const peOffset = dos.readUInt32LE(60)
    const pe = await read(24, peOffset)
    if (pe.readUInt32LE(0) !== 0x4550 || pe.readUInt16LE(4) !== 0x8664) {
      throw new Error('Cables Windows executable must be an x64 PE image')
    }
    const count = pe.readUInt16LE(6)
    const optionalSize = pe.readUInt16LE(20)
    if (count === 0 || count > 96 || optionalSize < 136) throw new Error('Windows PE header is invalid')
    const headers = await read(optionalSize + count * 40, peOffset + 24)
    if (headers.readUInt16LE(0) !== 0x20b || headers.readUInt32LE(108) < 3) {
      throw new Error('Windows PE32+ resource directory is missing')
    }
    function fileOffset(rva, length) {
      for (let i = 0; i < count; i++) {
        const section = optionalSize + i * 40
        const address = headers.readUInt32LE(section + 12)
        const bytes = headers.readUInt32LE(section + 16)
        if (rva >= address && rva - address + length <= bytes) {
          return headers.readUInt32LE(section + 20) + rva - address
        }
      }
      throw new Error('Windows PE resource is outside its section')
    }
    const resourceRva = headers.readUInt32LE(128)
    const resourceSize = headers.readUInt32LE(132)
    const resource = await read(resourceSize, fileOffset(resourceRva, resourceSize))
    function entries(offset) {
      const count = resource.readUInt16LE(offset + 12) + resource.readUInt16LE(offset + 14)
      if (offset + 16 + count * 8 > resource.length) throw new Error('Windows PE directory is truncated')
      return Array.from({ length: count }, (_, index) => {
        const entry = offset + 16 + index * 8
        const id = resource.readUInt32LE(entry)
        const target = resource.readUInt32LE(entry + 4)
        let name = id
        if (id & 0x80000000) {
          const start = id & 0x7fffffff
          const end = start + 2 + resource.readUInt16LE(start) * 2
          if (end > resource.length) throw new Error('Windows PE resource name is truncated')
          name = resource.toString('utf16le', start + 2, end).toUpperCase()
        }
        return { name, directory: Boolean(target & 0x80000000), offset: target & 0x7fffffff }
      })
    }
    const type = entries(0).find((entry) => entry.name === 'INTEGRITY')
    const name = type?.directory && entries(type.offset).find((entry) => entry.name === 'ELECTRONASAR')
    if (!name?.directory) throw new Error('Windows Electron ASAR integrity resource is missing')
    const languages = entries(name.offset)
    if (languages.length !== 1 || languages[0].directory) {
      throw new Error('Windows Electron ASAR integrity resource is ambiguous')
    }
    const location = languages[0].offset
    const length = resource.readUInt32LE(location + 4)
    const raw = await read(length, fileOffset(resource.readUInt32LE(location), length))
    const records = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw))
    const matches = Array.isArray(records) && records.filter((record) =>
      typeof record?.file === 'string' && record.file.replace(/\\+/g, '/') === 'resources/app.asar')
    if (!matches || matches.length !== 1 || matches[0].alg?.toUpperCase() !== 'SHA256' ||
        !/^[a-f0-9]{64}$/i.test(matches[0].value)) {
      throw new Error('Windows Electron app.asar SHA256 integrity record is invalid')
    }
    return matches[0].value.toLowerCase()
  } finally {
    await file.close()
  }
}
