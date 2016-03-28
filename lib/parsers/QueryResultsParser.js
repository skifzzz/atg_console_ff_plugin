var QueryResultsParser = function (document) {
    this.result = new Object();
    this.result.data = new Array();
    this._resultNodeXPath = '/html/body/pre/code';
    this._commentedOutPropetriesXPath = 'comment()';
    this._itemPropertyXPath = 'set-property';
    this._itemXPath = '/items/add-item';

    this._parse = function (document) {
        var rawResultsIterator = document.evaluate(this._resultNodeXPath, document, null, XPathResult.ANY_TYPE, null);
        
        var rawResultsHTML = rawResultsIterator.iterateNext();
        if (rawResultsHTML) {
            var textArea = document.createElement('textarea');
            textArea.innerHTML = rawResultsHTML.innerHTML;
            var preparedXml = textArea.value;
            preparedXml = preparedXml.substring(preparedXml.indexOf("<"));
            preparedXml = "<items> " + preparedXml + " </items>";
            
            var parser = new DOMParser();
            var itemsXml = parser.parseFromString(preparedXml, "application/xml");
            alert(itemsXml);
            if (itemsXml) {
                var singleItemIterator = itemsXml.evaluate(this._itemXPath, itemsXml, null, XPathResult.ANY_TYPE, null);
                var singleItem = singleItemIterator.iterateNext();
                
                while(singleItem) {
                    var parsedItem = this._parseSingleItem(itemsXml, singleItem);
                    if (parsedItem) {
                        if (parsedItem['$error']) {
                            console.error("Parsing error: " + parsedItem['$error']);
                        } else {
                            this.result.data.push(parsedItem);
                        }
                    }
                    singleItem = singleItemIterator.iterateNext();
                }
            }
        }
    };
    
    this._parseSingleItem = function (xmlDoc,item) {
        var parsedItem = new Object();
        var parsedWithoutErrors = true;
        if (item)  {
            if (item.attributes) {
                if (item.attributes['item-descriptor']) {
                    parsedItem['$type'] = item.attributes['item-descriptor'].value;
                }
                if (item.attributes['id']) {
                    parsedItem['$id'] = item.attributes['id'].value;
                }
                
                var commentedPropertyIterator = xmlDoc.evaluate(this._commentedOutPropetriesXPath, item, null, XPathResult.ANY_TYPE, null);
                var commentedProperty = commentedPropertyIterator.iterateNext();
                
                while (commentedProperty) {
                    parsedWithoutErrors &= this._addInfoFromCommentedProperty(parsedItem, commentedProperty);
                    commentedProperty = commentedPropertyIterator.iterateNext();
                }
                
                var regularPropertyIterator = xmlDoc.evaluate(this._itemPropertyXPath, item, null, XPathResult.ANY_TYPE, null);
                var property = regularPropertyIterator.iterateNext();
                
                while (property) {
                    parsedWithoutErrors &= this._addInfoFromProperty(parsedItem, property);
                    property = regularPropertyIterator.iterateNext();
                }
            }
            
        }
        
        if (!parsedWithoutErrors && !parsedItem['$error']) {
            parsedItem['$error'] = "General parsing error for mode: \n" + (item ? item.innerHTML : item);
        }
        
        return parsedItem;
    };
    
    this._addInfoFromProperty = function (parentItem, property) {
        if (property.attributes['name'] && property.textContent) {
            var name = property.attributes['name'].value;
            parentItem[name] = new Object();
            parentItem[name]['value'] = property.textContent;
            return true;
        }
        
        return false;
    };
    
    this._addInfoFromCommentedProperty = function (parentItem, commentString) {
        var obj = new Object();
        if (commentString.textContent.indexOf('rdonly') != -1) {
            obj['readOnly'] = true;
        }
        if (commentString.textContent.indexOf('derived') != -1) {
            obj['derived'] = true;
        }
        var clearedString = commentString.textContent.substring(commentString.textContent.indexOf('<'),commentString.textContent.lastIndexOf('>') + 1);
        var parser = new DOMParser();
        var node = parser.parseFromString(clearedString, "application/xml");
        if (node.firstChild) {
            node = node.firstChild;
            if (node.attributes['name'] && node.textContent) {
                var name = node.attributes['name'].value;
                parentItem[name] = obj;
                parentItem[name]['value'] = node.textContent;
                
                return true;
            }
        }
        
        return false;
    };
    
    this._parse(document);
};

function handleParseResults(footprint) {
    var queryParser = new QueryResultsParser(document);
    queryParser.result.footprint = footprint;
    alert(queryParser.result.data[0]);
    self.port.emit("parse-done", queryParser.result);
}

self.port.on("start-parse", handleParseResults);

