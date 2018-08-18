const Installer = require ('./installer');
const { merge, omit } = require ('lodash');

module.exports = Installer.extend ({
  run (addons) {
    return this.addMissingTargetToPackages (addons.packages)
      .then (packages => packages.filter (this.mustInstall.bind (this, this.blueprint.project.addonPackages)))
      .then (packages => {
        if (packages.length === 0)
          return;

        const options = merge ({packages}, omit (addons, ['packages']));
        return this.blueprint.addAddonsToProject (options);
      });
  }
});
