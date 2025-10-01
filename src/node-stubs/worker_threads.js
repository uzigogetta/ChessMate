class UnsupportedWorkerThreads {
  constructor() {
    throw new Error('worker_threads is not available in this environment.');
  }
}

module.exports = new Proxy({}, {
  get() {
    throw new Error('worker_threads is not available in this environment.');
  },
  apply() {
    throw new Error('worker_threads is not available in this environment.');
  },
  construct() {
    throw new Error('worker_threads is not available in this environment.');
  },
});

