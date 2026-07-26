import { Directory, File, Paths } from "expo-file-system";

const GENERATED_DIRECTORY_NAME = "generated";

function generatedDirectory(): Directory {
  const directory = new Directory(Paths.document, GENERATED_DIRECTORY_NAME);
  directory.create({ idempotent: true, intermediates: true });
  return directory;
}

export async function downloadGeneratedAssets(imageUrls: string[], requestId: string): Promise<string[]> {
  const directory = generatedDirectory();
  return Promise.all(
    imageUrls.map(async (url, index) => {
      const name = `${requestId}-${index + 1}.png`;
      const destination = new File(directory, name);
      await File.downloadFileAsync(url, destination, { idempotent: true });
      return `${GENERATED_DIRECTORY_NAME}/${name}`;
    }),
  );
}

export function discardGeneratedAssets(assetPaths: string[]): void {
  for (const assetPath of assetPaths) {
    const file = new File(Paths.document, assetPath);
    if (file.exists) {
      file.delete();
    }
  }
}
