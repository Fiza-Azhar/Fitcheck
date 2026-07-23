// Wire shapes between the Expo backend and the local Python rembg sidecar.
// Both sides speak base64 JSON so the route stays a plain fetch with no binary
// handling and no native dependency.
export interface BgRemovalRequestBody {
  imageBase64: string;
}

export interface BgRemovalResponseBody {
  cutoutBase64: string;
}
