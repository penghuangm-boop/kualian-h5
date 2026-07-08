const { startServer } = require("./server/index");

if (require.main === module) {
  startServer();
}

module.exports = {
  startServer
};
