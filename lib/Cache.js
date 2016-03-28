Cache = function(){
    this._cache = {
        tries: new Array(),
        itemInfos : new Array(),
        queryResults : new Array(),
        statusInfos : new Array()
    };
    
    this.clearAll = function() {
        Object.keys(this._cache).forEach(function(cacheKey) {
                this._cache[cacheKey] = new Array();
            });  
    };
    
    this.cleanInfosBySessionId = function(sessionId) {
        var fullKey = null;
        Object.keys(this._cache).forEach(function(cacheKey) {
                fullKey = this._cleanCacheInfo(_cache[cacheKey], fullKey, sessionId);
            });
    };
    
    this.invokeWithStatusIfAbsent = function (cacheType, key, callback) {
        console.log("debug: " + cacheType + " - " + key + " processing");
        var cachedValue = this.getCachedValue(cacheType,key);
        if (!cachedValue) {
            this.invokeWithStatus(cacheType, key, callback);
        }
    };
    
    this.invokeWithStatus = function (cacheType, key, callback) {
        console.log("New cache record in " + cacheType + " will be created for key: " + key);
        var statusInfos = this._cache["statusInfos"];
        var statusInfo = statusInfos[key];
        if (!statusInfo) {
            statusInfo = new Object();
        }

        callback (statusInfo);

        statusInfos[key] = statusInfo;
    };
    
    this._cleanCacheInfo = function (caches, fullKey, partialKey) {
      if (fullKey) {
          caches[fullKey] = null;
          delete caches[fullKey];
          return fullKey;
      } else {
          var foundFullKey = null;
          Object.keys(caches).every(function (key){
              if (key.indexOf(partialKey) > -1) {
                foundFullKey = key;
                this._cache.tries[key] = null;
                delete this._cache.tries[key];
                return false;
            }
            return true;
          });
          
          return foundFullKey;
      };
    };
      
    this.getCache = function(cacheName) {
        return this._cache[cacheName];
    };

    this.getCachedValue = function (cacheName, cacheKey) {
        return this.getCache(cacheName)[cacheKey];
    };
};

module.exports.Cache = Cache;

