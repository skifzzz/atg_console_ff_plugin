// require the SDK modules
const { Panel } = require("dev/panel");
const { Cache } = require("../lib/Cache.js");
const { Tool } = require("dev/toolbox");
const { Class } = require("sdk/core/heritage");
let { Cc, Ci } = require('chrome');
var self = require("sdk/self");
var tabs = require("sdk/tabs");

var cookieSvc = Cc["@mozilla.org/cookieService;1"]
                  .getService(Ci.nsICookieService);
var ios = Cc["@mozilla.org/network/io-service;1"]
        .getService(Ci.nsIIOService);
var observerService = Cc["@mozilla.org/observer-service;1"].
    getService(Ci.nsIObserverService);

var trieBuilder = require("prefixtree/PrefixTreeBuilder");

var defaultGrammar = ["print","query", "not", "and", "is" ,"null"];

var cookieChangedObserver = {
  observe : function(aSubject, aTopic, aData) {
    if (aTopic == "cookie-changed") {
      if (aData == "cleared" || aData == "reload") {
          cache.clearAll();
      } else if (aData == "changed" && aSubject.name.toString().toUpperCase().indexOf("JSESSIONID") != -1){
          cache.cleanInfosBySessionId(aSubject.value.toString());
      }
    }
  }
};

observerService.addObserver(cookieChangedObserver, "cookie-changed", false);

const { MessageChannel } = require("sdk/messaging");

var aCPipeline = null;
var xmlQueryPipeline = null;

function handleFindMessage(event){
    aCPipeline.port1.start();
   var cachedTrie = cache.getCachedValue("tries",_createTabCookieKey(tabs.activeTab));
   if (cachedTrie) {
       aCPipeline.port1.postMessage(cachedTrie.find(event.data));
   }
};

function handlePostXmlQuery (event) {
    var footprint = _createTabCookieKey(tabs.activeTab);
    var statusInfo = cache.getCachedValue("statusInfos", footprint);
    if (statusInfo && statusInfo["queryProcessor"].worker) {
        var data = {"query":event.data, "footprint":footprint};
        statusInfo["queryProcessor"].worker.port.emit("submit-query", data);
    }
}

// define a atgConsole class
// that inherits from dev/panel
const ATGConsole = Class({
  extends: Panel,
  label: "Dyn Admin console",
  tooltip: "Dev console to use with dyn/admin abilities as RQL or dynamic component properties changing",
  icon: self.data.url("plane_64.png"),
  url: self.data.url("atg-panel.html"),
//           contentScript: self.data.url("atg-panel-ui.js"),
  // when the panel is created,
  // take a reference to the debuggee
  setup: function(options) {
    this.cache = self.cache;
  },
  
  dispose: function() {
      aCPipeline = null;
      cache.clearAll();
  },
  // when the panel's script is ready,
  // send it a message containing
  // port for comunnication from panel script
  onReady: function() {
      panelObj = this;
      createChannelsAndRefreshCaches();
  }
});
exports.atgConsole = ATGConsole;

// create a new tool,
// initialized with the
// atgConsole's constructor
const replTool = new Tool({
  panels: { atgConsole: ATGConsole }
});

var panelObj;

var cache = new Cache();

tabs.on("ready", function(tab) {validateCachesForTab(tab, true);});
tabs.on("activate", function(tab) {validateCachesForTab(tab, false);});

function createChannelsAndRefreshCaches() {
    if (panelObj) {
        aCPipeline = new MessageChannel();
        aCPipeline.port1.onmessage = handleFindMessage;
        console.log("ATG console is ready");
        console.log("trying to prepare panel to work with " + tabs.activeTab.url);
        panelObj.postMessage("CHANNEL_FIND_IN_TRIE", [aCPipeline.port2]);
        xmlQueryPipeline = new MessageChannel();
        xmlQueryPipeline.port1.onmessage = handlePostXmlQuery;
    //      xmlQueryPipeline.port1.onmessage = function (event) {panelObj.handlePostXmlQuery(event);};
        panelObj.postMessage("CHANNEL_XML_QUERY", [xmlQueryPipeline.port2]);
    }
    validateCachesForTab(tabs.activeTab,false);
}

function validateCachesForTab(tab, force) {
    console.log("working with: " + tab.url);
    
    var dynAdminPrefixIndex = tab.url.indexOf("dyn/admin/nucleus/");
    var dynAdminPrefixLength = "dyn/admin/nucleus/".length;
    
    if (dynAdminPrefixIndex != -1) {
        console.log(tab.url + " considered as dyn/admin page; cache will be validated");
        var cacheKey = _createTabCookieKey(tab);
        if (cacheKey) {
            var thisHolder = this;
            cache.invokeWithStatusIfAbsent("tries", cacheKey, function(statusInfo){
                    thisHolder._addParserInfoToStatus(tab, cacheKey, statusInfo
                        , "itemsList", '../lib/parsers/ItemsListParser.js'
                        , force, handleItemsListParsed);
                });
            cache.invokeWithStatusIfAbsent("itemInfos", cacheKey, function(statusInfo){
                    thisHolder._addParserInfoToStatus(tab, cacheKey, statusInfo
                        , "repositoryDefinition", '../lib/parsers/RepositoryDefinitionParser.js'
                        , force, handleRepositoryDefinitionParsed);
                });
//            cache.invokeWithStatusIfAbsent("queryResults", cacheKey, function(statusInfo){
//                    thisHolder._addParserInfoToStatus(tab, cacheKey, statusInfo
//                        , "queryResults", '../lib/parsers/QueryResultsParser.js'
//                        , force, handleQueryResultsParsed);
//                });
            cache.invokeWithStatus("queryResults", cacheKey, function(statusInfo){
                    thisHolder._addParserInfoToStatus(tab, cacheKey, statusInfo
                        , "queryResults", '../lib/parsers/QueryResultsParser.js'
                        , force, handleQueryResultsParsed);
                });
            
            
            var statusInfos = cache.getCache("statusInfos");
            var statusInfo = statusInfos[cacheKey];
            if (!statusInfo) {
                statusInfo = new Object();
            }
            _addQueryProcessorInfoToStatus(tab,cacheKey, statusInfo, '../lib/XmlQueryProcessor.js', force);
            
            statusInfos[cacheKey] = statusInfo;
        } else {
            console.log("trie key \"" + cacheKey + "\" is not valid");
        }
    } else {
        console.log("not ATG related" + tab.url + " ignoring ")
    }
    
};

function _addParserInfoToStatus(tab, footprint, statusObj, parserName, parserScriptURL, forceAttach, parseDoneCallback) {
    if (!statusObj[parserName] || forceAttach) {
        statusObj[parserName] = new Object();
        statusObj[parserName].worker = tab.attach({
                contentScriptFile: self.data.url(parserScriptURL)
            });
        statusObj[parserName].state = "init";
        statusObj[parserName].worker.port.on("parse-done", parseDoneCallback);

        statusObj[parserName].worker.port.emit("start-parse", footprint);
    }
}

function _addQueryProcessorInfoToStatus(tab, footprint, statusObj, scriptURL, forceAttach, querySubmittedCallback) {
    if (!statusObj["queryProcessor"] || forceAttach) {
        statusObj["queryProcessor"] = new Object();
        statusObj["queryProcessor"].worker = tab.attach({
                contentScriptFile: self.data.url(scriptURL)
            });
        statusObj["queryProcessor"].state = "init";
        if (querySubmittedCallback) {
            statusObj["queryProcessor"].worker.port.on("query-submitted", querySubmittedCallback);
        }
    }
}

function handleItemsListParsed (result) {
    if (result && result.data) {
        var trie = trieBuilder.create(3,defaultGrammar.concat(result.data));
        var cachedTries = cache.getCache("tries");
        cachedTries[result.footprint] = trie;
        var statusInfo = cache.getCachedValue("statusInfos",result.footprint);
        statusInfo["itemsList"].state = "done";
        console.log("trie:" + trie);
    } else {
        console.log("cannot build trie - page is not parsed correctly")
    }
};

function handleRepositoryDefinitionParsed (result) {
    if (result && result.data) {
        var itemInfos = cache.getCache("itemInfos");
        itemInfos[result.footprint] = result.data;
        var statusInfo = cache.getCachedValue("statusInfos",result.footprint);
        statusInfo["repositoryDefinition"].state = "done";
        console.log(result);
    } else {
        console.log("cannot build trie - page is not parsed correctly")
    }
};

function handleQueryResultsParsed (result) {
    if (result && result.data) {
        var itemInfos = cache.getCache("queryResults");
        itemInfos[result.footprint] = result.data;
        var statusInfo = cache.getCachedValue("statusInfos",result.footprint);
        statusInfo["queryResults"].state = "done";
        console.log(result);
    } else {
        console.log("Query results are absent on the page or parsing failed");
    }
};

function _createTabCookieKey (tab) {
    var dynAdminPrefixIndex = tab.url.indexOf("dyn/admin/nucleus/");
    var dynAdminPrefixLength = "dyn/admin/nucleus/".length;
    var key = tab.url.substring((dynAdminPrefixIndex + dynAdminPrefixLength), tab.url.lastIndexOf("/"));
    var cookieValue = "";
    var uri = ios.newURI(tab.url.substring(0,dynAdminPrefixIndex), null, null);
    var cookieValue = cookieSvc.getCookieString(uri, null).replace(/(?:(?:^|.*;\s*)JSESSIONID\s*\=\s*([^;]*).*$)|^.*$/, "$1");

    key = key.replace(/^\u002f*/,"");
    if (key && cookieValue) {
        key = cookieValue + "_" + key;
        return key;
    }
    
    return null;
};

