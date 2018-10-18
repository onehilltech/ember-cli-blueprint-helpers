const Blueprint = require ('ember-cli/lib/models/blueprint');
const { BaseObject } = require ('base-object');

const execa = require ('execa');
const semver = require ('semver');
const Bluebird = require ('bluebird');
const path = require ('path');

const util = require ('util');
const debug = require ('debug') ('ember-cli-blueprint-helpers:blueprint');

const { readJson } = require ('fs-extra');

/**
 * @class Blueprint
 *
 * The base class for all
 * @type {{new(*=): Class, prototype: Class}}
 */
module.exports = BaseObject.extendClass (Blueprint, {
  /// Properties that are arrays and will be concatenated.
  concatProperties: ['packages', 'addons'],

  /// List of packages to install with the Blueprint.
  packages: null,

  /// List of add-ons to install with the blueprint.
  addons: null,

  /// Description for the blueprint.
  description: '',

  name: null,

  path: null,

  /**
   * Initialize the blueprint class.
   *
   * This class is adapting the Blueprint class from ember-cli to work under the
   * base-object type hierarchy.
   *
   * @param blueprintPath
   */
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

        debug (`installing packages: ${util.inspect (packages)}`);
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

        debug (`installing addons: ${util.inspect (packages)}`);
        return packages.reduce ((promise, pkg) => promise.then (() => this.addAddonToProject (pkg)), Promise.resolve ());
      })
  },

  _filterUninstalledPackages (packages) {
    debug (`filtering not installed packages in ${util.inspect (packages)}`);

    return Bluebird.filter (packages, this._checkNotInstalled.bind (this));
  },

  _checkNotInstalled ({name, target}) {
    return this._getPackageVersion (name).then (version => {
      debug (`comparing ${name}@${target} with ${name}@${version}`);

      return !version || !semver.satisfies (target, version)
    });
  },

  /**
   * Add the missing targets to the packages.
   *
   * @param packages
   * @return {Promise}
   * @private
   */
  _addMissingTargetToPackages (packages) {
    debug (`adding missing targets to packages ${util.inspect (packages)}`);

    // Make sure we return a copy of the object because the blueprint model from
    // ember-cli modifies the package name. Unfortunately, it means that if an
    // add-on is a dependency in multiple addons, then the name of the addon
    // will include the version.

    return Promise.all (packages.map (({name, target}) => {
      if (!!target)
        return {name, target};

      return this._getLatestPackageVersion (name)
        .then (version => {
          debug (`setting target for ${name} to ${version}`);

          return {name, target: version};
        });
    }));
  },

  _getLatestPackageVersion (name) {
    debug (`getting latest version for ${name}`);

    return execa ('npm', ['show', name, 'version']).then (({stdout}) => stdout);
  },

  _getPackageVersion (name) {
    debug (`checking installed version for ${name}`);

    let jsonFileName = path.resolve ('node_modules', name, 'package.json');

    return readJson (jsonFileName)
      .then (({version}) => version)
      .catch (() => null);
  }
});