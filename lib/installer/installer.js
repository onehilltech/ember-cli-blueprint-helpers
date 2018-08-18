const semver = require ('semver');
const execa = require ('execa');
const CoreObject = require ('core-object');

/**
 * @class Installer
 * @type {Class}
 *
 * The base class for the installer helper classes.
 */
module.exports = CoreObject.extend ({
  blueprint: null,

  addMissingTargetToPackages (packages) {
    return Promise.all (packages.map (pkg => {
      if (pkg.target)
        return pkg;

      return this.getLatestPackageVersion (pkg.name)
        .then (version => {
          pkg.target = version;

          return pkg;
        });
    }));
  },

  getLatestPackageVersion (name) {
    return execa ('npm', ['show', name, 'version']).then (({stdout}) => stdout);
  },

  mustInstall (packages, pkg) {
    const installed = packages[pkg.name];
    return !installed || semver.gt (pkg.target, installed.pkg.version);
  }
});
