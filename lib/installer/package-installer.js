const Installer = require ('./installer');
const { merge, omit } = require ('lodash');
const semver = require ('semver');

module.exports = Installer.extend ({
  run (packages) {
    return this.addMissingTargetToPackages (packages)
      .then (packages => packages.filter (this.mustInstall.bind (this)))
      .then (packages => {
        if (packages.length === 0)
          return;

        return this.blueprint.addPackagesToProject (packages);
      });
  },

  mustInstall (pkg) {
    const version = this.getPackageVersionSync (pkg.name);
    return !version || semver.gt (pkg.target, version);
  }
});
