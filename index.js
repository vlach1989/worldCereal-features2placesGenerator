const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const config = require('./inputs/config.json');
const features = require('./inputs/fetaures.json');
const linking = require('./inputs/placeKeyByFeatureKey.json');

/**
 * Generate place metadata
 * @param key {string} uuid
 * @param featureKey {string} feature key used for nameInternal
 * @param nameDisplay {string}
 * @param placeLinking {{applicationKey: string, scopeKey: string}}
 * @returns {Object} Panther's place metadata
 */
function getPlaceMetadata(key, featureKey, nameDisplay, placeLinking) {
    return {
        key,
        data: {
            ...(placeLinking || {}),
            nameDisplay,
            nameInternal: `place_${featureKey}`
        }
    }
}

/**
 * Create linking file
 * @param linking {Object} featureKey-placeKey pairs
 */
function createLinkingFile(linking) {
    fs.writeFile('./outputs/placeKeyByFeatrueKey.json', JSON.stringify(linking, null, "\t"), err => {
        if (err) {
            console.error("Error while creating placeKeyByFeatureKey.json file!");
        } else {
            console.log("placeKeyByFeatureKey.json file was created successfully");
        }
    });
}

/**
 * Create linking file
 * @param linking {Object} featureKey-placeKey pairs
 */
function createPlacesFile(linking) {
    fs.writeFile('./outputs/places.json', JSON.stringify(linking, null, "\t"), err => {
        if (err) {
            console.error("Error while creating places.json file!");
        } else {
            console.log("places.json file was created successfully");
        }
    });
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