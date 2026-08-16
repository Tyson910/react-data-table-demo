import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import * as path from "node:path";

const MRF_DIR = path.join(import.meta.dirname, "..", "mrf-output");

export type StoredMrfFile = {
  name: string;
  size: number;
  createdAt: string;
  content: string;
};

export interface MrfFileRepository {
  save(name: string, content: string): Promise<void>;
  list(): Promise<StoredMrfFile[]>;
}

/**
 * Keeps disk-specific persistence out of the routes and MRF generation logic.
 * The application can replace this implementation with an in-memory repository
 * for tests or a remote/object-storage implementation without changing callers.
 */
class LocalMrfFileRepository implements MrfFileRepository {
  async save(name: string, content: string): Promise<void> {
    await mkdir(MRF_DIR, { recursive: true });
    await writeFile(path.join(MRF_DIR, name), content);
  }

  async list(): Promise<StoredMrfFile[]> {
    await mkdir(MRF_DIR, { recursive: true });
    const names = (await readdir(MRF_DIR)).filter((name) => name.endsWith(".json"));

    const files = await Promise.all(names.map((name) => this.read(name)));
    return files.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private async read(name: string): Promise<StoredMrfFile> {
    const filePath = path.join(MRF_DIR, name);
    const [stats, content] = await Promise.all([stat(filePath), readFile(filePath, "utf8")]);

    return { name, size: stats.size, createdAt: stats.birthtime.toISOString(), content };
  }
}

export const mrfFileRepository = new LocalMrfFileRepository();
