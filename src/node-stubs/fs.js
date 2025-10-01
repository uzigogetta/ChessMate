function unsupported(name) {
  return () => {
    throw new Error(`fs.${name} is not supported in this runtime.`);
  };
}

module.exports = {
  readFile(_path, callback) {
    const error = new Error('fs.readFile is not supported in this runtime.');
    if (typeof callback === 'function') {
      callback(error);
      return;
    }
    throw error;
  },
  readFileSync: unsupported('readFileSync'),
  createReadStream: unsupported('createReadStream'),
  existsSync: unsupported('existsSync'),
  statSync: unsupported('statSync'),
};
