var XmlQueryProcessor = function () {
    this._formXPath = "/html/body/form[last()]";
    this._formTextAreaXPath = "/html/body/form[last()]/p/textarea[@name='xmltext']";
    
    this.submitQuery = function (query) {
        var converted = this._convertToXml(query);
        
        if (converted) {
            var textareaIterator = document.evaluate(this._formTextAreaXPath, document, null, XPathResult.ANY_TYPE, null);
            
            var textareaNode = textareaIterator.iterateNext();
            
            console.log("textarea: "  + textareaNode + ":" + textareaNode.innerHTML);
            
            if (textareaNode) {
                textareaNode.value = converted;
            }
            var formIterator = document.evaluate(this._formXPath, document, null, XPathResult.ANY_TYPE, null);
            
            var formNode = formIterator.iterateNext();
            
            console.log("formNode: "  + formNode + ":" + formNode.innerHTML);
            
            if (formNode) {
                formNode.submit();
            }
        }
    };
    
    this._convertToXml = function(query) {
        var converted = null;
        if (query) {
            var splitted = query.split(/[\s\r\n\t,]+/);
            console.log("query was splitted to: " + splitted);
            if (query.toUpperCase().startsWith("PRINT")) {
                converted = this._convertAsPrint(splitted);
            } else if (query.toUpperCase().startsWith("QUERY")) {
                converted = this._convertAsQuery(splitted);
            } else if (query.toUpperCase().startsWith("REMOVE")) {
                converted = this._convertAsRemove(splitted);
            } else {
                var objStart = query.indexOf("{");
                var objEnd = query.indexOf("}");
                var itemObj = null;
                if (objStart != -1 && objEnd != -1) {
                    itemObj = JSON.parse(query.substring(objStart, objEnd));
                }
                if (query.toUpperCase().startsWith("UPDATE") && itemObj) {
                    converted = this._convertAsUpdate(itemObj);
                } else if (query.toUpperCase().startsWith("ADD") && itemObj) {
                    converted = this._convertAsAdd(itemObj);
                } else {
                    console.error(query + " is not supported");
                }
            }
        }
        
        if (converted) {
            console.log("query was converted to xml: " + converted);
        }
        
        return converted;
    };
    
    this._convertAsPrint = function (splittedQuery) {
        var converted = '<print-item item-descriptor="' + splittedQuery[1] + '" ';
        if (splittedQuery[2]) {
            converted += 'id="' + splittedQuery[2] + '"';
        }
        converted += "/>"
        
        return converted;
    };
    
    this._convertAsQuery = function (splittedQuery) {
        var converted = '<query-items item-descriptor="' + splittedQuery[1] + '">';
        
        for (var i = 2; i < splittedQuery.length; i++) {
            converted += splittedQuery[i];
        }
        converted += '</query-items>';
        
        return converted;
    };
    
    this._convertAsRemove = function (splittedQuery) {
        if (splittedQuery[2]) {
            
        } else {
            console.error("Id of item should be provided for remove query");
        }
    };
    
    this._convertAsUpdate = function (itemJson) {
        console.error("Not supported yet");
    }
    
    this._convertAsAdd = function (itemJson) {
        console.error("Not supported yet");
    }
};

function handleSubmitQuery(data/* {query:"someQuery", footprint: "footprint"} */) {
    var query = data.query;
    var footprint = data.footprint;
    if (query && footprint) {
        var processor = new XmlQueryProcessor();
        processor.submitQuery(query);
        //parser.result.footprint = footprint;
        self.port.emit("query-submitted", data);
    }
}

self.port.on("submit-query", handleSubmitQuery);

