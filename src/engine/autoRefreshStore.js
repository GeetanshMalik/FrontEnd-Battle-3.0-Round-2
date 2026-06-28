let autoRefresh = true;
const listeners = new Set();

export const autoRefreshStore = {
  get() {
    return autoRefresh;
  },
  
  set(val) {
    if (autoRefresh === val) return;
    autoRefresh = val;
    listeners.forEach(fn => fn());
  },
  
  subscribe(fn) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }
};
