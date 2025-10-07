const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Allow Metro to resolve .pip.js entry files
config.resolver.sourceExts.push("pip.js");

module.exports = config;
