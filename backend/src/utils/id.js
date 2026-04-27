function generateId(prefix) {
  const timestamp = Date.now().toString();
  const randomSuffix = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");

  return `${prefix}${timestamp}${randomSuffix}`;
}

module.exports = {
  generateId,
};
