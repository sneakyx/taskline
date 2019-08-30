#!/usr/bin/env node

'use strict';
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const config = require('./config');
const render = require('./render');
const Storage = require('./storage');

const {
  basename,
  join
} = path;

class LocalStorage extends Storage {
  constructor() {
    super();
  }

  init() {
    this._storageDir = join(this._mainAppDir, 'storage');
    this._archiveDir = join(this._mainAppDir, 'archive');
    this._tempDir = join(this._mainAppDir, '.temp');
    this._archiveFile = join(this._archiveDir, 'archive.json');
    this._mainStorageFile = join(this._storageDir, 'storage.json');

    this._ensureDirectories();
  }

  get _mainAppDir() {
    const {
      tasklineDirectory
    } = config.get();
    const defaultAppDirectory = join(os.homedir(), '.taskline');

    if (!tasklineDirectory) {
      return defaultAppDirectory;
    }

    if (!fs.existsSync(tasklineDirectory)) {
      render.invalidCustomAppDir(tasklineDirectory);
      process.exit(1);
    }

    return join(tasklineDirectory, '.taskline');
  }

  _ensureMainAppDir() {
    if (!fs.existsSync(this._mainAppDir)) {
      fs.mkdirSync(this._mainAppDir);
    }
  }

  _ensureStorageDir() {
    if (!fs.existsSync(this._storageDir)) {
      fs.mkdirSync(this._storageDir);
    }
  }

  _ensureTempDir() {
    if (!fs.existsSync(this._tempDir)) {
      fs.mkdirSync(this._tempDir);
    }
  }

  _ensureArchiveDir() {
    if (!fs.existsSync(this._archiveDir)) {
      fs.mkdirSync(this._archiveDir);
    }
  }

  _cleanTempDir() {
    const tempFiles = fs
      .readdirSync(this._tempDir)
      .map(x => join(this._tempDir, x));

    if (tempFiles.length !== 0) {
      tempFiles.forEach(tempFile => fs.unlinkSync(tempFile));
    }
  }

  _ensureDirectories() {
    this._ensureMainAppDir();
    this._ensureStorageDir();
    this._ensureArchiveDir();
    this._ensureTempDir();
    this._cleanTempDir();
  }

  _getRandomHexString(length = 8) {
    return crypto
      .randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }

  _getTempFile(filePath) {
    const randomString = this._getRandomHexString();
    const tempFilename = basename(filePath)
      .split('.')
      .join(`.TEMP-${randomString}.`);
    return join(this._tempDir, tempFilename);
  }

  get() {
    const self = this;

    return new Promise(resolve => {
      let data = {};
      if (fs.existsSync(self._mainStorageFile)) {
        const content = fs.readFileSync(self._mainStorageFile, 'utf8');
        data = JSON.parse(content);
      }

      resolve(data);
    });
  }

  getArchive() {
    let archive = {};

    if (fs.existsSync(this._archiveFile)) {
      const content = fs.readFileSync(this._archiveFile, 'utf8');
      archive = JSON.parse(content);
    }

    return archive;
  }

  set(data) {
    const self = this;

    return new Promise(((resolve, reject) => {
      data = JSON.stringify(data, null, 4);
      const tempStorageFile = self._getTempFile(self._mainStorageFile);

      fs.writeFileSync(tempStorageFile, data, 'utf8');
      fs.renameSync(tempStorageFile, self._mainStorageFile);
      resolve();
    }));
  }

  setArchive(archive) {
    const data = JSON.stringify(archive, null, 4);
    const tempArchiveFile = this._getTempFile(this._archiveFile);

    fs.writeFileSync(tempArchiveFile, data, 'utf8');
    fs.renameSync(tempArchiveFile, this._archiveFile);
  }
}

module.exports = LocalStorage;
