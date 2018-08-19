const Installer = require ('./installer');
const semver = require ('semver');
const BPromise = require ('bluebird');

module.exports = Installer.extend ({
  run (packages) {
    return this.addMissingTargetToPackages (packages)
      .then (packages => BPromise.filter (packages, this.mustInstall.bind (this)))
      .then (packages => {
        if (packages.length === 0)
          return;

        return this.blueprint.addPackagesToProject (packages);
      });
  },

  mustInstall (pkg) {
    return this.getPackageVersion (pkg.name).then (version => !version || semver.gt (pkg.target, version));
  }
});
