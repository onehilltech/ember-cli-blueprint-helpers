const Blueprint = require ('ember-cli/lib/models/blueprint');
const { BaseObject } = require ('base-object');

const execa = require ('execa');
const npmCheck = require ('npm-check');
const semver = require ('semver');
const Bluebird = require ('bluebird');
const path = require ('path');

/**
 * @class Blueprint
 *
 * The base class for all
 * @type {{new(*=): Class, prototype: Class}}
 */
module.exports = BaseObject.extendClass (Blueprint, {
  concatProperties: ['packages', 'addons'],

  /// List of packages to install with the Blueprint.
  packages: null,

  /// List of add-ons to install with the blueprint.
  addons: null,

  description: '',

  name: null,

  path: null,

  init (blueprintPath) {
    this._super.call (this, {});

    this.path = blueprintPath;
    this.name = path.basename (blueprintPath);
  },

  normalizeEntityName () {

  },

  /**
   * Run the process after the installation is complete. This includes installing
   * the listed packages and addons.
   *
   * @return {*|Promise<void>}
   */
  afterInstall () {
    return this._installPackages ()
      .then (() => this._installAddons ());
  },

  /**
   * Install the listed packages.
   *
   * @return {Promise<void>}
   * @private
   */
  _installPackages () {
    if (!this.packages)
      return Promise.resolve ();

    return this._addMissingTargetToPackages (this.packages.slice ())
      .then (this._filterUninstalledPackages.bind (this))
      .then (packages => {
        if (packages.length === 0)
          return;

        return this.addPackagesToProject (packages);
      });
  },

  /**
   * Install the listed addons.
   *
   * @private
   */
  _installAddons () {
    if (!this.addons)
      return Promise.resolve ();

    return this._addMissingTargetToPackages (this.addons.slice ())
      .then (this._filterUninstalledPackages.bind (this))
      .then (packages => {
        if (packages.length === 0)
          return;

        return packages.reduce ((promise, pkg) => promise.then (() => this.addAddonToProject (pkg)), Promise.resolve ());
      })
  },

  _filterUninstalledPackages (packages) {
    return Bluebird.filter (packages, this._checkNotInstalled.bind (this));
  },

  _checkNotInstalled ({name, target}) {
    return this._getPackageVersion (name).then (version => !version || !semver.satisfies (target, version));
  },

  /**
   * Add the missing targets to the packages.
   *
   * @param packages
   * @return {Promise}
   * @private
   */
  _addMissingTargetToPackages (packages) {
    return Promise.all (packages.map (pkg => {
      if (pkg.target)
        return pkg;

      return this._getLatestPackageVersion (pkg.name)
        .then (version => {
          pkg.target = version;

          return pkg;
        });
    }));
  },

  _getLatestPackageVersion (name) {
    return execa ('npm', ['show', name, 'version']).then (({stdout}) => stdout);
  },

  _getPackageVersion (name) {
    return npmCheck ().then (state => {
      const packages = state.get ('packages').filter (({moduleName}) => moduleName === name);
      return packages.length > 0 ? packages[0].installed : null;
    });
  }
});