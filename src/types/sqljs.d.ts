declare module 'sql.js' {
  export type QueryExecResult = { columns: string[]; values: (string | number | null)[][] }
  export interface Statement {
    bind(values?: unknown[]): void
    step(): boolean
    getAsObject(): Record<string, string | number | null>
    free(): void
  }
  export interface Database {
    exec(sql: string): void
    run(sql: string, params?: unknown[]): void
    prepare(sql: string): Statement
    export(): Uint8Array
    close(): void
  }
  export interface SqlJsStatic {
    Database: new (data?: BufferSource) => Database
  }
  export default function initSqlJs(config?: {
    locateFile?: (file: string) => string
  }): Promise<SqlJsStatic>
}
