const AddonInstaller = require ('./addon-installer');
const PackageInstaller = require ('./package-installer');

exports.AddonInstaller = AddonInstaller;
exports.PackageInstaller = PackageInstaller;

exports.installAddons = function (blueprint, addons) {
  return new AddonInstaller ({blueprint}).run (addons);
};

exports.installPackages = function (blueprint, packages) {
  return new PackageInstaller ({blueprint}).run (packages);
};
