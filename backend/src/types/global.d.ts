/* eslint-disable @typescript-eslint/no-explicit-any */
// 全局类型声明

import 'express'

declare module 'express' {
  interface Request {
    body: any
    params: Record<string, string>
    query: Record<string, string | string[]>
  }
  interface Response {
    download(path: string, filename?: string, callback?: (err: any) => void): void
  }
}

declare module 'uuid' {
  export function v4(): string
}

declare module 'zod' {
  export const z: {
    object: <T>(schema: T) => any
    string: () => any
    number: () => any
    boolean: () => any
    optional: <T>(schema: T) => any
    array: <T>(schema: T) => any
    literal: <T>(value: T) => any
    union: <T>(schemas: T[]) => any
    enum: <T>(values: T[]) => any
    record: <T>(schema: T) => any
    unknown: () => any
    parse: <T>(data: any, schema: any) => T
    safeParse: <T>(data: any, schema: any) => { success: boolean; data?: T; error?: any }
  }
  export function object<T>(schema: T): any
  export function string(): any
  export function number(): any
  export function boolean(): any
  export function optional<T>(schema: T): any
  export function array<T>(schema: T): any
  export function literal<T>(value: T): any
  export function union<T>(schemas: T[]): any
  export function record<T>(schema: T): any
  export function unknown(): any
  export function parse<T>(data: any, schema: any): T
  export function safeParse<T>(data: any, schema: any): { success: boolean; data?: T; error?: any }
}

declare module 'jszip' {
  class JSZip {
    file(name: string, content: string | Buffer): JSZip
    folder(name: string): JSZip
    generateAsync(options: { type: 'nodebuffer'; compression?: string; compressionOptions?: any }): Promise<Buffer>
  }
  export default JSZip
}

declare module 'puppeteer' {
  class Browser {
    newPage(): Promise<Page>
    close(): Promise<void>
  }
  class Page {
    setContent(html: string): Promise<void>
    pdf(options: any): Promise<Buffer>
    evaluateHandle(pageFunction: string): Promise<any>
  }
  export function launch(options: any): Promise<Browser>
}

declare module 'better-sqlite3' {
  class Database {
    constructor(path: string)
    prepare(sql: string): {
      run(...params: any[]): void
      get(...params: any[]): any
      all(...params: any[]): any[]
    }
    exec(sql: string): void
    transaction<T>(callback: () => T): (() => T)
    pragma(sql: string): void
  }
  export default Database
}

declare module 'cors' {
  export default function cors(options?: any): (req: any, res: any, next: any) => void
}

declare module 'helmet' {
  export default function helmet(options?: any): (req: any, res: any, next: any) => void
}

declare module 'morgan' {
  export default function morgan(format?: string, options?: any): (req: any, res: any, next: any) => void
}

declare module 'dotenv' {
  export function config(options?: any): void
}

declare module 'express-rate-limit' {
  export default function rateLimit(options: {
    windowMs: number
    max: number
    message?: string
    standardHeaders?: boolean
    legacyHeaders?: boolean
  }): (req: any, res: any, next: any) => void
}

