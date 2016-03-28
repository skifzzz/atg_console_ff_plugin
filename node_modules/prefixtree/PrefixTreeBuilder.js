 PrefixTreeBuilder = {
    create : function (maxNumberOfCharsInPrefix, initValues) {
        'use strict';
        
        var tree = require('./PrefixTree');
        var Utils = require('./Utils');
        
        if (!maxNumberOfCharsInPrefix || ! initValues ) {
            console.error("Missing parameters");
            return null;
        }
        
        var splittedValues = [];
        
        var nodes = [];
        var leafs = [];
        
        for (var i = 0; i < initValues.length; i++) {
            leafs = [];
            
            splittedValues[initValues[i]] = new Array();
            var subNodes = nodes;
            
            Utils._splitToLeafs(leafs, initValues[i], maxNumberOfCharsInPrefix);
            for (var j = maxNumberOfCharsInPrefix - 1; j > 0; j--) {
                subNodes = new Array();
                Utils._splitAllToNodes(subNodes, leafs, j);
                
                leafs = subNodes;
            }
            
            Utils._mergeSubArrays(nodes,subNodes);
        }
        console.log(" tree is created for dictionary: " + initValues);
        
        return new tree(nodes);
    }
};

module.exports.create = PrefixTreeBuilder.create;