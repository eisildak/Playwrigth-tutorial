module.exports = {
  default: {
    requireModule: ["ts-node/register"],
    require: ["src/support/**/*.ts", "src/steps/**/*.ts"],
    format: ["progress"],
    publishQuiet: true
  }
};