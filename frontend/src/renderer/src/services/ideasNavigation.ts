/**
 * Ideas open in a separate window/tab, so closing that surface returns focus
 * to the untouched project window and cannot overwrite its editor state.
 */
export function returnFromIdeas() {
  window.close()
}
