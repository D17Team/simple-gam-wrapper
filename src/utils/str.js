
/**
 * Kebab case conversion function.
 *
 * @export
 * @param {string} str String to convert
 * @return {string} 
 * @private
 */
export function kebabCase (str) {
  return str
  .replace(/([a-z])([A-Z])/g, '$1-$2')    // get all lowercase letters that are near to uppercase ones
  .replace(/[\s_]+/g, '-')                // replace all spaces and low dash
  .toLowerCase()                          // convert to lower case
}