import { Mutex } from "async-mutex";
import { mkdir, readFile, stat, unlink, writeFile, rename } from "fs/promises";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { proto, initAuthCreds, BufferJSON } from "@whiskeysockets/baileys";

const fileLocks = new Map<string, Mutex>();

const getFileLock = (path: string): Mutex => {
  let mutex = fileLocks.get(path);
  if (!mutex) {
    mutex = new Mutex();
    fileLocks.set(path, mutex);
  }
  return mutex;
};

const fixFileName = (file?: string) => file?.replace(/\//g, "__")?.replace(/:/g, "-");

/**
 * Robust Multi-File Auth State with:
 * 1. Atomic writes (write to .tmp then rename) to eliminate 0-byte file corruption during server restarts
 * 2. Automatic backup of creds.json (creds.json.bak)
 * 3. Self-healing fallback if creds.json is ever empty or invalid JSON
 */
export const useRobustMultiFileAuthState = async (folder: string) => {
  const writeData = async (data: any, file: string) => {
    const fixed = fixFileName(file);
    if (!fixed) return;
    const filePath = join(folder, fixed);
    const tmpPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
    const mutex = getFileLock(filePath);

    return mutex.acquire().then(async (release) => {
      try {
        const serialized = JSON.stringify(data, BufferJSON.replacer);
        if (!serialized || serialized.length < 2) {
          return;
        }

        // 1. Write atomically to tmp file first
        await writeFile(tmpPath, serialized, { encoding: "utf-8" });
        // 2. Rename tmp file to target destination (atomic on POSIX/Linux)
        await rename(tmpPath, filePath);

        // 3. If saving creds.json with valid registered identity, create a backup
        if (fixed === "creds.json" && (data?.me?.id || data?.registered)) {
          const bakPath = join(folder, "creds.json.bak");
          await writeFile(bakPath, serialized, { encoding: "utf-8" }).catch(() => {});
        }
      } catch (err) {
        try {
          if (existsSync(tmpPath)) {
            await unlink(tmpPath).catch(() => {});
          }
        } catch {}
        throw err;
      } finally {
        release();
      }
    });
  };

  const readData = async (file: string) => {
    const fixed = fixFileName(file);
    if (!fixed) return null;
    const filePath = join(folder, fixed);
    const mutex = getFileLock(filePath);

    return await mutex.acquire().then(async (release) => {
      try {
        let raw = await readFile(filePath, { encoding: "utf-8" });
        
        // Check for empty or 0-byte file
        if (!raw || raw.trim().length === 0) {
          if (fixed === "creds.json") {
            // Attempt self-healing from backup
            const bakPath = join(folder, "creds.json.bak");
            if (existsSync(bakPath)) {
              const bakRaw = await readFile(bakPath, { encoding: "utf-8" }).catch(() => null);
              if (bakRaw && bakRaw.trim().length > 2) {
                console.log(`[BaileysAuth] Restored empty creds.json from backup in ${folder}`);
                await writeFile(filePath, bakRaw, { encoding: "utf-8" }).catch(() => {});
                raw = bakRaw;
              } else {
                return null;
              }
            } else {
              return null;
            }
          } else {
            return null;
          }
        }

        try {
          return JSON.parse(raw, BufferJSON.reviver);
        } catch (parseErr) {
          if (fixed === "creds.json") {
            const bakPath = join(folder, "creds.json.bak");
            if (existsSync(bakPath)) {
              const bakRaw = await readFile(bakPath, { encoding: "utf-8" }).catch(() => null);
              if (bakRaw && bakRaw.trim().length > 2) {
                const parsed = JSON.parse(bakRaw, BufferJSON.reviver);
                console.log(`[BaileysAuth] Restored corrupted creds.json from backup in ${folder}`);
                await writeFile(filePath, bakRaw, { encoding: "utf-8" }).catch(() => {});
                return parsed;
              }
            }
          }
          return null;
        }
      } catch (error) {
        // File doesn't exist or read failed
        if (fixed === "creds.json") {
          const bakPath = join(folder, "creds.json.bak");
          if (existsSync(bakPath)) {
            try {
              const bakRaw = await readFile(bakPath, { encoding: "utf-8" });
              if (bakRaw && bakRaw.trim().length > 2) {
                const parsed = JSON.parse(bakRaw, BufferJSON.reviver);
                console.log(`[BaileysAuth] Recovered missing creds.json from backup in ${folder}`);
                await writeFile(filePath, bakRaw, { encoding: "utf-8" }).catch(() => {});
                return parsed;
              }
            } catch {}
          }
        }
        return null;
      } finally {
        release();
      }
    });
  };

  const removeData = async (file: string) => {
    const fixed = fixFileName(file);
    if (!fixed) return;
    const filePath = join(folder, fixed);
    const mutex = getFileLock(filePath);

    return mutex.acquire().then(async (release) => {
      try {
        await unlink(filePath).catch(() => {});
      } finally {
        release();
      }
    });
  };

  const folderInfo = await stat(folder).catch(() => null);
  if (folderInfo) {
    if (!folderInfo.isDirectory()) {
      throw new Error(`Found non-directory file at auth folder path: ${folder}`);
    }
  } else {
    await mkdir(folder, { recursive: true });
  }

  const creds = (await readData("creds.json")) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type: string, ids: string[]) => {
          const data: Record<string, any> = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}.json`);
              if (type === "app-state-sync-key" && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },
        set: async (data: any) => {
          const tasks: Promise<any>[] = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const file = `${category}-${id}.json`;
              tasks.push(value ? writeData(value, file) : removeData(file));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: async () => {
      return writeData(creds, "creds.json");
    },
  };
};
