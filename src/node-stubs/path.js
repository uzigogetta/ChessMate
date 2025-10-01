module.exports = {
  dirname(filename) {
    if (typeof filename !== 'string') return '.';
    const parts = filename.split(/[\/]/);
    parts.pop();
    return parts.length ? parts.join('/') : '.';
  },
  normalize(path) {
    if (typeof path !== 'string') return path;
    return path.replace(/\\/g, '/');
  }
};
