/**
 * Slug Generator
 * 
 * Converts playlist names into URL-safe slugs.
 * Supports both English and Arabic text.
 */

/**
 * Generate a URL-safe slug from a string.
 * 
 * Examples:
 *   "My Summer Vibes!" → "my-summer-vibes"
 *   "موسيقى رومانسية"  → "موسيقى-رومانسية"
 *   "Workout Music #1" → "workout-music-1"
 *   "  Trim spaces  "  → "trim-spaces"
 */
export function slugify(text: string): string {
  if (!text) return '';
  
  let slug = text.trim().toLowerCase();
  
  // Replace whitespace and underscores with hyphens
  slug = slug.replace(/[\s_]+/g, '-');
  
  // Remove characters that aren't:
  // - ASCII letters/numbers
  // - Arabic characters (\u0600-\u06FF)
  // - Hyphens
  slug = slug.replace(/[^\u0600-\u06FFa-z0-9-]/g, '');
  
  // Collapse multiple hyphens into one
  slug = slug.replace(/-+/g, '-');
  
  // Trim hyphens from start and end
  slug = slug.replace(/^-+|-+$/g, '');
  
  // Fallback if slug is empty (e.g., name was all special chars)
  if (!slug) {
    slug = 'playlist';
  }
  
  // Limit length to 60 chars
  if (slug.length > 60) {
    slug = slug.substring(0, 60).replace(/-+$/g, '');
  }
  
  return slug;
}

/**
 * Generate a unique slug by appending -2, -3 etc. if the slug is taken.
 * 
 * @param baseSlug - The desired slug
 * @param checkExists - Async function that returns true if slug is already taken
 * @returns A unique slug
 */
export async function generateUniqueSlug(
  baseSlug: string,
  checkExists: (slug: string) => Promise<boolean>
): Promise<string> {
  const slug = slugify(baseSlug);
  
  // Try the base slug first
  if (!(await checkExists(slug))) {
    return slug;
  }
  
  // Try -2, -3, -4... up to -999
  for (let i = 2; i < 1000; i++) {
    const candidate = `${slug}-${i}`;
    if (!(await checkExists(candidate))) {
      return candidate;
    }
  }
  
  // Last resort: append timestamp
  return `${slug}-${Date.now().toString(36)}`;
}

/**
 * Validate a slug for safety
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length < 1 || slug.length > 80) return false;
  // Only allow ASCII letters, numbers, Arabic, and hyphens
  return /^[\u0600-\u06FFa-z0-9-]+$/.test(slug);
}
