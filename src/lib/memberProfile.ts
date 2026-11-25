export const profilePhotoBucket = 'profile-photos';
export const maxProfilePhotoBytes = 256 * 1024;
export const maxProfileBioLength = 120;
export function validProfileBio(value: string) { return Array.from(value).length <= maxProfileBioLength; }
export function profilePhotoPath(userId: string) { return `${userId}/avatar.webp`; }
export function isProfileWebp(bytes: Uint8Array) {
  return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
}
