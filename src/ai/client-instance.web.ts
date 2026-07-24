const CLIENT_ID_KEY = "flipcanvas.client-instance.v1";

function createClientInstanceId(): string {
  return createId("client");
}

export async function getClientInstanceId(): Promise<string> {
  const existing = globalThis.localStorage?.getItem(CLIENT_ID_KEY);
  if (existing) {
    return existing;
  }
  const created = createClientInstanceId();
  globalThis.localStorage?.setItem(CLIENT_ID_KEY, created);
  return created;
}
import { createId } from "../utils/id";
