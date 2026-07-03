const { expo } = require('./app.json');

/**
 * Dynamic config on top of app.json: CI stamps each APK with an increasing
 * versionCode (the GitHub Actions run number) so every build installs as a
 * proper update and is distinguishable from the last one.
 */
module.exports = () => {
  const runNumber = parseInt(process.env.GITHUB_RUN_NUMBER ?? '0', 10);
  return {
    ...expo,
    android: {
      ...expo.android,
      versionCode: runNumber > 0 ? runNumber : 1,
    },
  };
};
