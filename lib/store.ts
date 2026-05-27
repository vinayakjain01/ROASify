// Global store for file persistence across pages
// Uses a module-level variable (survives navigation within same tab session)

export interface UploadedFile {
  name: string;
  size: number;
  rows?: number;
  dataUrl?: string; // base64 for passing around
}

interface AppStore {
  metaFile: File | null;
  shopifyFile: File | null;
  googleFile: File | null;
  metaMeta: UploadedFile | null;
  shopifyMeta: UploadedFile | null;
  googleMeta: UploadedFile | null;
  panelOpen: boolean;
}

// Module-level singleton — persists across Next.js client-side navigations
const store: AppStore = {
  metaFile: null,
  shopifyFile: null,
  googleFile: null,
  metaMeta: null,
  shopifyMeta: null,
  googleMeta: null,
  panelOpen: true,
};

export function getStore() {
  return store;
}

export function setFile(key: 'meta' | 'shopify' | 'google', file: File | null) {
  if (key === 'meta') {
    store.metaFile = file;
    store.metaMeta = file ? { name: file.name, size: file.size } : null;
  } else if (key === 'shopify') {
    store.shopifyFile = file;
    store.shopifyMeta = file ? { name: file.name, size: file.size } : null;
  } else {
    store.googleFile = file;
    store.googleMeta = file ? { name: file.name, size: file.size } : null;
  }
}

export function setPanelOpen(open: boolean) {
  store.panelOpen = open;
}

export function hasRequiredFiles() {
  return store.metaFile !== null && store.shopifyFile !== null;
}