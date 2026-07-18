const { expo } = require('./app.json');

/**
 * Dynamic config on top of app.json.
 *
 * GitHub CI stamps each debug-signed test APK with an increasing versionCode
 * (the Actions run number) so every download installs as a proper update.
 *
 * EAS store builds do NOT go through here for the build number — eas.json sets
 * `appVersionSource: "remote"`, so EAS auto-increments versionCode/buildNumber
 * on its servers. We therefore only set versionCode when running inside GitHub
 * CI; otherwise we leave it unset and let EAS own it.
 */
module.exports = () => {
  const runNumber = parseInt(process.env.GITHUB_RUN_NUMBER ?? '0', 10);
  const android = { ...expo.android };
  if (runNumber > 0) android.versionCode = runNumber;
  return { ...expo, android };
};
