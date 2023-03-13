const {v4: uuidv4} = require('uuid');
const fs = require('fs');
const validator = require('validator');
const envelope = require('@turf/envelope');

const config = require('./inputs/config.json');
const features = require('./inputs/fetaures.json');
const linking = require('./inputs/placeKeyByFeatureKey.json');

/**
 * check, if JSON is valid
 * @param json {JSON}
 * @returns {boolean}
 */
function isValidJson(json) {
    return validator.isJSON(json);
}

/**
 * Generate place metadata
 * @param key {string} uuid
 * @param featureKey {string} feature key used for nameInternal
 * @param nameDisplay {string}
 * @param placeLinking {{applicationKey: string, scopeKey: string}}
 * @param geometry {JSON}
 * @returns {Object} Panther's place metadata
 */
function getPlaceMetadata(key, featureKey, nameDisplay, placeLinking, geometry) {
    const geom = envelope(geometry);
    const {bbox, ...feature} = geom;

    return {
        key,
        data: {
            ...(placeLinking || {}),
            nameDisplay,
            nameInternal: `place_${featureKey}`,
            geometry: feature,
        }
    }
}

/**
 * Create linking file
 * @param linking {Object} featureKey-placeKey pairs
 */
function createLinkingFile(linking) {
    const json = JSON.stringify(linking, null, "\t");

    if (isValidJson(json)) {
        fs.writeFile('./outputs/placeKeyByFeatrueKey.json', json, err => {
            if (err) {
                console.error("Error while creating placeKeyByFeatureKey.json file! File writing failed.");
            } else {
                console.log("placeKeyByFeatureKey.json file was created successfully");
            }
        });
    } else {
        throw new Error("Error while creating placeKeyByFeatureKey.json file! JSON is not valid.")
    }
}

/**
 * Create places file
 * @param places {Array}
 */
function createPlacesFile(places) {
    const json = JSON.stringify(places, null, "\t");

    if (isValidJson(json)) {
        fs.writeFile('./outputs/places.json', json, err => {
            if (err) {
                console.error("Error while creating places.json file!");
            } else {
                console.log("places.json file was created successfully");
            }
        });
    } else {
        throw new Error("Error while creating places.json file! JSON is not valid.")
    }
}

/**
 * Main executable
 * @param inputFeatures {JSON}
 * @param config {JSON}
 * @param config.fidColumnName {string} define fid column in feature.properties of inputFeature features
 * @param config.nameColumnName {string} define name column in feature.properties of inputFeature features. It will be used to generate place's nameDisplay property
 * @param [linking] {JSON} placeKeyByFeatureKey linking to preserve uuids of already existing places
 */
function run(inputFeatures, config, linking) {
    const features = inputFeatures?.features || inputFeatures;

    if (features?.length) {
        const places = [];
        const newLinking = {};
        features.forEach(feature => {
            const {geometry, properties, id} = feature;
            const {fidColumnName, nameColumnName, placeLinking} = config;
            const featureKey = id || properties[fidColumnName];
            const nameDisplay = properties[nameColumnName] || featureKey;
            const placeKey = linking[featureKey] || uuidv4();

            if (!featureKey) {
                console.warn("No feature key generated. Feature will be omitted. Feature: ", feature);
            } else {
                if (!geometry) {
                    console.warn(`No geometry for feature with key ${featureKey}. Feature will be omitted.`);
                } else {
                    places.push(getPlaceMetadata(placeKey, featureKey, nameDisplay, placeLinking, geometry));
                    newLinking[featureKey] = placeKey;
                }
            }
        });

        if (places?.length) {
            createLinkingFile(newLinking);
            createPlacesFile(places);
        } else {
            throw new Error("No places created!")
        }
    } else {
        throw new Error("No features!")
    }
}

run(features, config, linking);