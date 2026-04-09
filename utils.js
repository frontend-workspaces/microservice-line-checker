/**
 * Checks if a LINE ID is "Regular" (Basic) or "Premium".
 * Regular IDs: Always 8 chars after @, lowercase alphanumeric only.
 * Premium IDs: Anything else (custom length, uppercase, etc.)
 * * @param {string} lineId - The LINE ID (e.g., "@308pexeq")
 * @returns {string} - "Regular" or "Premium"
 */
export const checkLineIdType = (lineId) => {
  // Regex explanation:
  // ^@      : Starts with @
  // [a-z0-9]: Lowercase letters and numbers only
  // {8}     : Exactly 8 characters long
  // $       : End of string
  const regularPattern = /^@[a-z0-9]{8}$/;

  if (regularPattern.test(lineId)) {
    return "Regular";
  } else {
    return "Premium";
  }
}
