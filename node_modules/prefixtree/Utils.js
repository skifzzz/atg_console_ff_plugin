Utils = {
    _splitToLeafs : function (existingNodes, word, numberOfChars) {
        'use strict';
        
        for (var i = 0; i <= word.length - numberOfChars; i++) {
            var nodeName = word.toLowerCase().substring(i, i + numberOfChars);
            if (!existingNodes[nodeName]) {
             Utils._buildLeaf(existingNodes, nodeName, word);
            } 
        }
    },
    
    _splitToNodes : function (existingNodes, node, word, numberOfChars) {
        'use strict';
        
        for (var i = 0; i <= word.length - numberOfChars; i++) {
            var nodeName = word.toLowerCase().substring(i, i + numberOfChars);
            if (!existingNodes[nodeName]) {
                Utils._buildLeaf(existingNodes, nodeName, node);
            } else {
                Utils._addNode(existingNodes[nodeName], node);
            }
        }
    },
    
    _splitAllToNodes : function (existingNodes, leafs, numberOfChars) {
        'use strict';
        
        Object.keys(leafs).forEach(function(key) {
            Utils._splitToNodes(existingNodes, leafs, key, numberOfChars);
        });
    },
    
    _updateSubTree : function (existingNode, additionalValues) {
        'use strict';
        
        if (!existingNode) {
            console.error('cant update node - node cant be null');
        } else {
            if (!existingNode.children) {
                existingNode.children = additionalValues;
            } else {
                existingNode.children = existingNode.children.concat(
                            additionalValues.filter(
                                function (item, pos) {
                                    return existingNode.children.indexOf(item) == -1;}
                            )
                        );
            }
        }
    }, 
    
    _buildNode : function (nodeKey, values) {
        'use strict';
        
        var node = new Object();
        node.key = nodeKey;
        node.children = values;
        
        return node;
    },
    
    _buildLeaf : function (parent, nodeKey, value) {
        'use strict';
        
        if (Array.isArray(value)) {
            var upperKey = nodeKey.toUpperCase();
            var filtredValues = new Array();
            Object.keys(value).forEach(function(key) {
                if (key.toUpperCase().indexOf(upperKey) > -1) {
                    filtredValues[key] = value[key];
                }
            });
            parent[nodeKey] = filtredValues;
        } else {
            parent[nodeKey] = [value];
        }
    },
    
    _addNode : function (node, value) {
        'use strict';
        
        if (node.length == 0) {
            node = [value];
        } else {
            var exists = false;
            for (var i in node) {
                if (node[i].toString().toUpperCase() == value.toString().toUpperCase()) {
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                node.push(value);
            }
        }
    },
    
    _mergeSubArrays : function(destination, source) {
        'use strict';
        
        for (var property in source) {
            if (source.hasOwnProperty(property)) {
                if (!destination[property]) {
                    destination[property] = source[property];
                } else {
                    if (source[property].length != 0) {
                        destination[property] = destination[property].concat(
                            source[property].filter(function (item, pos) {
                                return destination[property].indexOf(item) == -1;}
                            )
                        );
                    } else {
                        Utils._mergeSubArrays(destination[property],source[property]);
                    }
                }
            }
        }
        return destination;
    },
    
    _getAllLeafs : function (destinationArray, nodes) {
        'use strict';
        
        Object.keys(nodes).forEach(function(valueKey) {
            if (isNaN(valueKey)) {
                if (Array.isArray(nodes[valueKey])) {
                    Utils._getAllLeafs(destinationArray, nodes[valueKey]);
                } else {
                    destinationArray.push(nodes[valueKey]);
                }
            } else {
                if (destinationArray.indexOf(nodes[valueKey]) == -1) {
                    destinationArray.push(nodes[valueKey]);
                }
            }  
        });
    },
    
    _printTree : function (tree) {
        Object.keys(tree).forEach(function(key) {
            console.log(key + ' -> ');
            Utils._printNode(tree[key], 1);
        });
    },
    
    _printNode : function (node, numOfTabs) {
        var tabs = '';
        for (var i=0; i < numOfTabs; i++) {
            tabs += '|';
        }
        Object.keys(node).forEach(function(key) {
            if (Array.isArray(node[key])) {
                if (isNaN(key)) {
                    console.log(tabs + key + ' -> ');
                    Utils._printNode(node[key], ++numOfTabs);
                } else {
                    Utils._printNode(node[key], numOfTabs);
                }
            } else {
                console.log(tabs + node[key]);
            }
        });
    }
};

module.exports = Utils;