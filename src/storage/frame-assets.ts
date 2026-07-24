import { File, Paths } from "expo-file-system";

export function resolveFrameAssetUri(assetPath: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(assetPath)) {
    return assetPath;
  }

  return new File(Paths.document, assetPath).uri;
}
