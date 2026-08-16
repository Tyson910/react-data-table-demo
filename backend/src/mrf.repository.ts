import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { mrfMetaFieldsSchema } from "@mano/validators";

const MRF_DIR = path.join(import.meta.dirname, "..", "mrf-output");

export type MrfFileMeta = {
  name: string;
  size: number;
  createdAt: string;
  reportingEntityName: string;
  planName: string;
  planId: string;
  lastUpdatedOn: string;
};

export type StoredMrfFile = {
  name: string;
  size: number;
  createdAt: string;
  content: string;
};

export interface MrfFileRepository {
  save(name: string, content: string): Promise<void>;
  list(): Promise<MrfFileMeta[]>;
  get(name: string): Promise<StoredMrfFile | null>;
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

  async list(): Promise<MrfFileMeta[]> {
    await mkdir(MRF_DIR, { recursive: true });
    const names = (await readdir(MRF_DIR)).filter((name) => name.endsWith(".json"));

    const files = await Promise.all(names.map((name) => this.readMeta(name)));
    return files.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async get(name: string): Promise<StoredMrfFile | null> {
    try {
      const safeName = path.basename(name);
      const filePath = path.join(MRF_DIR, safeName);
      const [stats, content] = await Promise.all([stat(filePath), readFile(filePath, "utf8")]);
      return { name: safeName, size: stats.size, createdAt: stats.birthtime.toISOString(), content };
    } catch {
      return null;
    }
  }

  private async readMeta(name: string): Promise<MrfFileMeta> {
    const filePath = path.join(MRF_DIR, name);
    const [stats, raw] = await Promise.all([stat(filePath), readFile(filePath, "utf8")]);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }
    const result = mrfMetaFieldsSchema.safeParse(parsed);
    const data = result.success ? result.data : { reporting_entity_name: "", plan_name: "", plan_id: "", last_updated_on: "" };
    return {
      name,
      size: stats.size,
      createdAt: stats.birthtime.toISOString(),
      reportingEntityName: data.reporting_entity_name,
      planName: data.plan_name,
      planId: data.plan_id,
      lastUpdatedOn: data.last_updated_on,
    };
  }
}

export const mrfFileRepository = new LocalMrfFileRepository();
