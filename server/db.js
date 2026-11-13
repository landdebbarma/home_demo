import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

export const DATA_DIR = resolve(process.env.DATA_DIR || 'data')
export const UPLOAD_DIR = join(DATA_DIR, 'uploads')
mkdirSync(UPLOAD_DIR, { recursive: true })

export const db = new DatabaseSync(join(DATA_DIR, 'site.db'))
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')

// Migrations: append-only list, applied in order, tracked by PRAGMA user_version.
const migrations = [
  `CREATE TABLE admin (
     id INTEGER PRIMARY KEY CHECK (id = 1),
     email TEXT NOT NULL,
     pass_hash TEXT NOT NULL
   );
   CREATE TABLE sessions (
     token_hash TEXT PRIMARY KEY,
     expires_at INTEGER NOT NULL
   );
   CREATE TABLE media (
     id TEXT PRIMARY KEY,
     original_name TEXT NOT NULL,
     ext TEXT NOT NULL,
     width INTEGER NOT NULL,
     height INTEGER NOT NULL,
     widths TEXT NOT NULL,
     alt TEXT NOT NULL DEFAULT '',
     created_at INTEGER NOT NULL
   );
   CREATE TABLE projects (
     id INTEGER PRIMARY KEY,
     slug TEXT NOT NULL UNIQUE,
     title TEXT NOT NULL,
     category TEXT NOT NULL DEFAULT '',
     location TEXT NOT NULL DEFAULT '',
     year TEXT NOT NULL DEFAULT '',
     summary TEXT NOT NULL DEFAULT '',
     body TEXT NOT NULL DEFAULT '',
     status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','unpublished')),
     featured INTEGER NOT NULL DEFAULT 0,
     sort INTEGER NOT NULL DEFAULT 0,
     cover_media_id TEXT REFERENCES media(id),
     cover_alt TEXT NOT NULL DEFAULT '',
     meta TEXT NOT NULL DEFAULT '[]',
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL
   );
   CREATE TABLE project_images (
     id INTEGER PRIMARY KEY,
     project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
     media_id TEXT NOT NULL REFERENCES media(id),
     caption TEXT NOT NULL DEFAULT '',
     alt TEXT NOT NULL DEFAULT '',
     position INTEGER NOT NULL DEFAULT 0
   );
   CREATE INDEX project_images_project ON project_images(project_id, position);
   CREATE TABLE content (
     key TEXT PRIMARY KEY,
     value TEXT NOT NULL
   );
   CREATE TABLE enquiries (
     id INTEGER PRIMARY KEY,
     name TEXT NOT NULL,
     email TEXT NOT NULL,
     phone TEXT NOT NULL DEFAULT '',
     project_type TEXT NOT NULL DEFAULT '',
     location TEXT NOT NULL DEFAULT '',
     message TEXT NOT NULL,
     read INTEGER NOT NULL DEFAULT 0,
     created_at INTEGER NOT NULL
   );`,
]

const version = db.prepare('PRAGMA user_version').get().user_version
for (let i = version; i < migrations.length; i++) {
  db.exec('BEGIN')
  try {
    db.exec(migrations[i])
    db.exec(`PRAGMA user_version = ${i + 1}`)
    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
}

export function tx(fn) {
  db.exec('BEGIN')
  try {
    const r = fn()
    db.exec('COMMIT')
    return r
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
}
