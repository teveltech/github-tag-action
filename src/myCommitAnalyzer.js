const { isUndefined } = require('lodash');
const parser = require('conventional-commits-parser').sync;
const filter = require('conventional-commits-filter');
const debug = require('debug')('semantic-release:commit-analyzer');
const loadParserConfig = require('@semantic-release/commit-analyzer/lib/load-parser-config');
const loadReleaseRules = require('@semantic-release/commit-analyzer/lib/load-release-rules');
const analyzeCommit = require('@semantic-release/commit-analyzer/lib/analyze-commit');
const compareReleaseTypes = require('@semantic-release/commit-analyzer/lib/compare-release-types');
const RELEASE_TYPES = require('@semantic-release/commit-analyzer/lib/default-release-types');
const DEFAULT_RELEASE_RULES = require('@semantic-release/commit-analyzer/lib/default-release-rules');

function resolvePreset(presetName) {
    switch (presetName) {
        case 'atom': return require('conventional-changelog-atom');
        case 'codemirror': return require('conventional-changelog-codemirror');
        case 'conventionalcommits': return require('conventional-changelog-conventionalcommits');
        case 'eslint': return require('conventional-changelog-eslint');
        case 'express': return require('conventional-changelog-express');
        case 'jquery': return require('conventional-changelog-jquery');
        case 'jshint': return require('conventional-changelog-jshint');
        default: return require('conventional-changelog-angular');
    }
}

/**
 * A clone of @semantic-release/commit-analyzer::analyzeCommits that allows the parser config to be passed directly instead of referencing
 * a preset name as the standard loading mechanismn isn't amenable to packing with tss.
 */
async function analyzeCommits(pluginConfig, context) {
    const { commits, logger } = context;
    const releaseRules = loadReleaseRules(pluginConfig, context);
    const config = resolvePreset(pluginConfig.preset);
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