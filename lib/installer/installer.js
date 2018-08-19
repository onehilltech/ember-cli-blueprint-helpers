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

  getPackageVersion (name) {
    return execa ('npm', ['list', name, '--depth', '0', '--json'])
      .then (({stdout}) => {
        const {dependencies} = JSON.parse (stdout);
        return dependencies ? dependencies[name].version : null;
      });
  },

  getPackageVersionSync (name) {
    const {stdout} = execa.sync ('npm', ['list', name, '--depth', '0', '--json']);
    const {dependencies} = JSON.parse (stdout);
    return dependencies ? dependencies[name].version : null;
  },

  mustInstall (/*pkg*/) {
    return true;
  }
});
