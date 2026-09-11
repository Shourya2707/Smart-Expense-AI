// Tiny pub/sub so mutations anywhere (chat tools, modals, scanner) can tell
// pages to refetch without a full state-management library.

const EVENT = "smartexpense:data-changed";

export const emitDataChanged = (source = "unknown") => {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { source } }));
};

export const onDataChanged = (callback) => {
  const handler = (event) => callback(event.detail?.source);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
};
