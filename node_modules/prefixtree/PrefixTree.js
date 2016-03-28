var Utils = require('./Utils');

tree = function (rootNodes){
    this.rootNodes = rootNodes;
    
    
    this._findInArray = function(word, values, numOfChars){
        'use strict';
        
        var found = new Array();
        var isNodesFound = false;
        
        if (numOfChars <= word.length) {
            var key = word.substring(0, numOfChars).toUpperCase();
            Object.keys(values).forEach(function(valueKey) {
                if (isNaN(valueKey)) {
                    if (valueKey.toUpperCase().indexOf(key) > -1) {
                        if (Array.isArray(values[valueKey])) {
                            Utils._mergeSubArrays(found, values[valueKey]);
                            isNodesFound = true;
                        } else {
                            found.push(values[valueKey]);
                        }
                    }
                } else {
                    found[valueKey] = values[valueKey];
                }
            });

            if (isNodesFound) {
                found = this._findInArray(word, found, numOfChars + 1);
            }
        } else {
            Utils._getAllLeafs(found, values);
        }
        
        return found;
    };
    
    this.find = function (word) {
        'use strict';
        
        if (!word) {
            console.error("cannot find anything for word:" + word);
            return null;
        }
        
        return this._findInArray(word, this.rootNodes, 1);
        
    };
};

module.exports = tree;


