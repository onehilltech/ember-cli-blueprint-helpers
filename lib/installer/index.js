const AddonInstaller = require ('./addon-installer');

function installAddons (blueprint, addons) {
  return new AddonInstaller ({blueprint}).run (addons);
}

module.exports = installAddons;

