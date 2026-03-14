module.exports = {
  default: {
    requireModule: ["ts-node/register"],
    require: ["src/support/**/*.ts", "src/steps/**/*.ts"],
    paths: ["features/**/*.feature"],
    format: ["progress"],
    publishQuiet: true
  }
};