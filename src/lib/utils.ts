import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getPreviewUrl(previewURL?: string, tunnelURL?: string): string {
  const url = previewURL || tunnelURL || '';
  if (!url) return '';

  // Force HTTP for localhost to avoid SSL errors in local development
  // Chrome sometimes attempts to upgrade localhost subdomains to HTTPS
  if (url.includes('localhost') && url.startsWith('https://')) {
    return url.replace('https://', 'http://');
  }

  return url;
}

export function capitalizeFirstLetter(str: string) {
  if (typeof str !== 'string' || str.length === 0) {
    return str; // Handle non-string input or empty string
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}