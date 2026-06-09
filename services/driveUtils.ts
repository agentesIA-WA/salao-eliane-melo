/**
 * Utility functions for Google Drive integration.
 */

/**
 * Checks if a string is a Google Drive URL or a raw File ID and extracts the File ID.
 * Returns null if it doesn't match Google Drive formats.
 */
export function extractDriveFileId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // If it's a pure Google Drive File ID (usually 25-45 chars, alphanumeric with - and _)
  // e.g., 1Xy_zWf9-abcd1234_xyz
  const driveIdRegex = /^[a-zA-Z0-9_-]{25,45}$/;
  if (driveIdRegex.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.includes('drive.google.com') || trimmed.includes('drive.usercontent.google.com') || trimmed.includes('docs.google.com')) {
    // Matches standard view link format: /file/d/FILE_ID/view...
    const dMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]{25,45})/);
    if (dMatch && dMatch[1]) {
      return dMatch[1];
    }
    // Matches query parameter id: ?id=FILE_ID
    const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{25,45})/);
    if (idMatch && idMatch[1]) {
      return idMatch[1];
    }
    // Matches ucr/open formats: /open?id=FILE_ID
    const openMatch = trimmed.match(/\/open\?id=([a-zA-Z0-9_-]{25,45})/);
    if (openMatch && openMatch[1]) {
      return openMatch[1];
    }
  }

  return null;
}

/**
 * Transforms a Google Drive link or ID into a direct display thumbnail URL.
 * Falls back to the original URL if not a Drive link.
 */
export function getGoogleDriveThumbnail(urlOrId: string | undefined): string {
  if (!urlOrId) return '';
  const fileId = extractDriveFileId(urlOrId);
  if (fileId) {
    // lh3.googleusercontent.com/d/FILE_ID is the most robust, high-performance, and publicly readable Google Drive image preview URL.
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
  return urlOrId;
}

/**
 * Checks if a string is identified as a Google Drive resource.
 */
export function isGoogleDriveLink(input: string | undefined): boolean {
  if (!input) return false;
  return extractDriveFileId(input) !== null;
}
