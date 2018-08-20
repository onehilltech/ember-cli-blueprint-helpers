const Installer = require ('./installer');
const { merge, omit } = require ('lodash');
const semver = require ('semver');

module.exports = Installer.extend ({
  run (addons) {
    return this.addMissingTargetToPackages (addons.packages)
      .then (packages => packages.filter (this.mustInstall.bind (this)))
      .then (packages => {
        if (packages.length === 0)
          return;

        const options = merge ({packages}, omit (addons, ['packages']));
        return this.blueprint.addAddonsToProject (options);
      });
  },

  mustInstall (pkg) {
    const installed = this.blueprint.project.addonPackages[pkg.name];
    return !installed || semver.gt (semver.coerce (pkg.target).version, installed.pkg.version);
  }
});
