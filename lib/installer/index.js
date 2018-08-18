const AddonInstaller = require ('./addon-installer');

exports.AddonInstaller = AddonInstaller;

exports.installAddons = function (blueprint, addons) {
  return new AddonInstaller ({blueprint}).run (addons);
};

