module.exports = {
  createInterface() {
    throw new Error('readline is not available in this environment.');
  },
};

