const Blueprint = require ('ember-cli/lib/models/blueprint');
const { BaseObject } = require ('base-object');

const execa = require ('execa');
const semver = require ('semver');
const Bluebird = require ('bluebird');
const path = require ('path');

const util = require ('util');
const debug = require ('debug') ('ember-cli-blueprint-helpers:blueprint');
const { isArray } = require ('lodash');

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
  async _installPackages () {
    if (!this.packages)
      return

    const packages = await this._addMissingTargetToPackages (this.packages.slice ());
    const uninstalled = await this._filterUninstalledPackages (packages);

    if (uninstalled.length === 0)
      return;

    debug (`installing packages: ${util.inspect (uninstalled)}`);
    return this.addPackagesToProject (uninstalled);
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
      .then (this._filterUninstalledAddons.bind (this))
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

  _filterUninstalledAddons (addons) {
    debug (`filtering not installed addons in ${util.inspect (addons)}`);

    return Bluebird.filter (addons, this._checkAddonNotInstalled.bind (this));
  },

  async _checkNotInstalled ({name, target}) {
    const version = await this._getPackageVersion (name);
    debug (`comparing ${name}@${target} with ${name}@${version}`);

    return !version || !semver.satisfies (version, target);
  },

  /**
   * Add the missing targets to the packages.
   *
   * @param packages
   * @return {Promise}
   * @private
   */
  async _addMissingTargetToPackages (packages) {
    debug (`adding missing targets to packages ${util.inspect (packages)}`);

    // Make sure we return a copy of the object because the blueprint model from
    // ember-cli modifies the package name. Unfortunately, it means that if an
    // add-on is a dependency in multiple addons, then the name of the addon
    // will include the version.

    return Promise.all (packages.map (async ({name, target}) => {
      if (!!target)
        return {name, target};

      const version = await this._getLatestPackageVersion (name);

      debug (`setting target for ${name} to ${version}`);
      return { name, target: version};
    }));
  },

  async _checkAddonNotInstalled ({name, target}) {
    const installed = this.project.addonPackages[name];

    // The add-on has not been installed. We can just go ahead and return control
    // to the caller since there is no reason to proceed any further.
    if (!installed)
      return true;

    if (semver.validRange (target)) {
      // The target is a range. We need to find all versions of this package, and find the
      // latest one that matches the range. If that version is not installed, then we need
      // to install it.

      let versions = await this._listPackageVersions (name);

      if (!isArray (versions)) {
        versions = [versions];
      }

      // Filter all the versions that match the target range.
      const acceptable = versions.filter (version => semver.satisfies (version, target));

      // Check if the installed version is the latest version that matches the range.
      return acceptable.length === 0 || !semver.eq (installed.pkg.version, acceptable[acceptable.length - 1]);
    }
    else {
      return semver.eq (installed.pkg.version, target);
    }
  },

  async _getLatestPackageVersion (name) {
    debug (`getting latest version for ${name}`);

    const { stdout } = await execa ('npm', ['view', name, 'version']);
    return stdout;
  },

  async _listPackageVersions (name) {
    debug (`listing the versions for ${name}`);

    const { stdout } = await execa ('npm', ['view', name, 'versions', '-json']);
    return JSON.parse (stdout);
  },

  async _getPackageVersion (name) {
    debug (`checking installed version for ${name}`);

    const jsonFileName = path.resolve ('node_modules', name, 'package.json');

    try {
      const { version } = readJson (jsonFileName);
      return version;
    }
    catch (err) {
      return null;
    }
  }
});
