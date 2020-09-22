const { isUndefined } = require('lodash');
const parser = require('conventional-commits-parser').sync;
const filter = require('conventional-commits-filter');
const debug = require('debug')('semantic-release:commit-analyzer');
const loadReleaseRules = require('@semantic-release/commit-analyzer/lib/load-release-rules');
const analyzeCommit = require('@semantic-release/commit-analyzer/lib/analyze-commit');
const compareReleaseTypes = require('@semantic-release/commit-analyzer/lib/compare-release-types');
const RELEASE_TYPES = require('@semantic-release/commit-analyzer/lib/default-release-types');
const DEFAULT_RELEASE_RULES = require('@semantic-release/commit-analyzer/lib/default-release-rules');
const { isPlainObject } = require('lodash');
const { promisify } = require('util');

async function resolvePreset({ preset, config, parserOpts, presetConfig }, { cwd }) {
    let loadedConfig;
    switch (preset) {
        case 'atom': loadedConfig = require('conventional-changelog-atom'); break;
        case 'codemirror': loadedConfig = require('conventional-changelog-codemirror'); break;
        case 'conventionalcommits': loadedConfig = require('conventional-changelog-conventionalcommits'); break;
        case 'eslint': loadedConfig = require('conventional-changelog-eslint'); break;
        case 'express': loadedConfig = require('conventional-changelog-express'); break;
        case 'jquery': loadedConfig = require('conventional-changelog-jquery'); break;
        case 'jshint': loadedConfig = require('conventional-changelog-jshint'); break;
        default: loadedConfig = require('conventional-changelog-angular'); break;
    }

    loadedConfig = await (typeof loadedConfig === 'function'
        ? isPlainObject(presetConfig)
            ? loadedConfig(presetConfig)
            : promisify(loadedConfig)()
        : loadedConfig);

    return { ...loadedConfig.parserOpts, ...parserOpts };
}

/**
 * A clone of @semantic-release/commit-analyzer::analyzeCommits that allows the parser config to be passed directly instead of referencing
 * a preset name as the standard loading mechanismn isn't amenable to packing with tss.
 */
async function analyzeCommits(pluginConfig, context) {
    const { commits, logger } = context;
    const releaseRules = loadReleaseRules(pluginConfig, context);
    const config = await resolvePreset(pluginConfig, context);
    let releaseType = null;

    filter(
        commits
            .filter(({ message, hash }) => {
                if (!message.trim()) {
                    debug('Skip commit %s with empty message', hash);
                    return false;
                }

                return true;
            })
            .map(({ message, ...commitProps }) => ({ rawMsg: message, message, ...commitProps, ...parser(message, config) }))
    ).every(({ rawMsg, ...commit }) => {
        logger.log(`Analyzing commit: %s`, rawMsg);
        let commitReleaseType;

        // Determine release type based on custom releaseRules
        if (releaseRules) {
            debug('Analyzing with custom rules');
            commitReleaseType = analyzeCommit(releaseRules, commit);
        }

        // If no custom releaseRules or none matched the commit, try with default releaseRules
        if (isUndefined(commitReleaseType)) {
            debug('Analyzing with default rules');
            commitReleaseType = analyzeCommit(DEFAULT_RELEASE_RULES, commit);
        }

        if (commitReleaseType) {
            logger.log('The release type for the commit is %s', commitReleaseType);
        } else {
            logger.log('The commit should not trigger a release');
        }

        // Set releaseType if commit's release type is higher
        if (commitReleaseType && compareReleaseTypes(releaseType, commitReleaseType)) {
            releaseType = commitReleaseType;
        }

        // Break loop if releaseType is the highest
        if (releaseType === RELEASE_TYPES[0]) {
            return false;
        }

        return true;
    });
    logger.log('Analysis of %s commits complete: %s release', commits.length, releaseType || 'no');

    return releaseType;
}

module.exports = { analyzeCommits };