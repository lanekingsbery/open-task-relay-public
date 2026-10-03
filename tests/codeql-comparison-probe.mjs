// Diagnostic-only positive control. Never import, run, publish, or merge this file.
// Confirms that matching main/PR CodeQL configurations detect an introduced alert.
export function deliberatelyIncompleteHtmlFilter(value) {
 return value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
}
