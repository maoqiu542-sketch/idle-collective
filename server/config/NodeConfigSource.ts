import * as fs from 'fs/promises'
import * as path from 'path'
import type { ConfigSource } from '../../src/data/config/ConfigManager'

export class NodeConfigSource implements ConfigSource {
  constructor(private readonly rootDir: string = process.cwd()) {}

  async loadJson<T>(relativePath: string): Promise<T | null> {
    const candidates = [
      path.join(this.rootDir, relativePath),
      path.join(this.rootDir, 'public', relativePath),
      path.join(this.rootDir, relativePath.replace(/^config[\\/]/, 'public/config/')),
    ]

    for (const candidate of candidates) {
      try {
        const raw = await fs.readFile(candidate, 'utf-8')
        return JSON.parse(raw) as T
      } catch {
        // try next candidate
      }
    }

    return null
  }
}

