const execa = require ('execa');
const CoreObject = require ('core-object');
const npmCheck = require ('npm-check');

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

  getPackageVersion (name) {
    return npmCheck ().then (state => {
      const packages = state.get ('packages').filter (({moduleName}) => moduleName === name);
      return packages.length > 0 ? packages[0].installed : null;
    });
  },

  mustInstall (/*pkg*/) {
    return true;
  }
});
