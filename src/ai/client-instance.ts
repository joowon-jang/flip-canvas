import { File, Paths } from "expo-file-system";

import { createId } from "../utils/id";

const CLIENT_ID_FILE = new File(Paths.document, "flipcanvas-client-id.txt");

function createClientInstanceId(): string {
  return createId("client");
}

export async function getClientInstanceId(): Promise<string> {
  if (CLIENT_ID_FILE.exists) {
    const current = (await CLIENT_ID_FILE.text()).trim();
    if (current) {
      return current;
    }
  }

  const created = createClientInstanceId();
  CLIENT_ID_FILE.create({ overwrite: true, intermediates: true });
  CLIENT_ID_FILE.write(created);
  return created;
}
