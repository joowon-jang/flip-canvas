type GranularPermission = "audio" | "photo" | "video";

export async function requestPermissionsAsync(
  _writeOnly?: boolean,
  _granularPermissions?: GranularPermission[],
): Promise<{ granted: boolean }> {
  return { granted: false };
}

export async function saveToLibraryAsync(_localUri: string): Promise<void> {
  throw new Error("사진 보관함 저장은 iOS와 Android에서만 사용할 수 있습니다.");
}
