var RepositoryDefinitionParser = function (document) {
    this.result = new Object();
    this.result.data = new Object();
    this._linkToRepositoryDefinitionXPath = "/html/body/a[contains(text(), 'Examine Repository Template Definition')]/@href";
    this._definitionXmlXPath = "/html/body/table/tbody/tr[2]/td[2]/table/tbody/tr[4]/td[2]";
    this._itemDescriptorXPath = "//gsa-template/item-descriptor";
    this._complexPropertiesXPath = "//property[@item-type]";
    
    this.processPage = function (document) {
        var repositoryDefinitionURL = this._findLinkToRepositoryDefinition(document);
        
        var definitionXmlXPath = this._definitionXmlXPath;
        var itemDescriptorXPath = this._itemDescriptorXPath;
        var complexPropertiesXPath = this._complexPropertiesXPath;
        var result = this.result.data;
        
        var req = new XMLHttpRequest();
        console.log("trying request repository definition page at " + repositoryDefinitionURL);
        req.open('GET', repositoryDefinitionURL, true);
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
               if(req.status == 200) {
                   console.log("success");
                   var responseDoc = req.responseXML;
                   if (!responseDoc) {
                       var parser = new DOMParser();
                       responseDoc = parser.parseFromString(req.responseText,"text/html");
                   }
                   if (responseDoc) {
                       console.log("respronse was parsed " + responseDoc);
                       console.log("trying to use " + definitionXmlXPath + " to find definition xml");
                       var definitionPageIterator = responseDoc.evaluate(definitionXmlXPath, responseDoc, null, XPathResult.ANY_TYPE, null);
                       var definitionXMLElement = definitionPageIterator.iterateNext();
                       
                       if (definitionXMLElement) {
                           console.log("definition element was found: " + definitionXMLElement);
                           var parser = new DOMParser();
                           
                           //decode xml 
                           var textArea = document.createElement('textarea');
                            textArea.innerHTML = definitionXMLElement.innerHTML;
                            
                           var preparedXml = textArea.value;
                           if (preparedXml.startsWith("<pre>")) {
                               console.log ("make some cleanup");
                               preparedXml = preparedXml.substring(5);
                               
                               preparedXml = preparedXml.substring(0, preparedXml.lastIndexOf("</pre>"));
                               
                           }
                           var xmlDoc = parser.parseFromString(preparedXml, "application/xml");
                           
                           if (xmlDoc) {
                               console.log("xml was parsed ");
                               console.log("trying to find item descriptors with xpath " + itemDescriptorXPath);
                               var definitionIterator = xmlDoc.evaluate(itemDescriptorXPath, xmlDoc, null, XPathResult.ANY_TYPE, null);
                               
                               var itemDescriptor = definitionIterator.iterateNext();
                               while(itemDescriptor) {
                                   var itemDescriptorName = itemDescriptor.attributes.getNamedItem("name").value;
                                   result[itemDescriptorName] = new Array();
                                   console.log("itemDescriptor: " + itemDescriptor.attributes.getNamedItem("name").value + " : " + itemDescriptor);
                                   for (var i =0; i<10; i++){
                                  // console.log ("children:" + itemDescriptor.children[i].attributes.getNamedItem("name").value);
                                   }
                                   var propertyIterator = xmlDoc.evaluate(complexPropertiesXPath, itemDescriptor, null, XPathResult.ANY_TYPE, null);
                                   
                                   var property = propertyIterator.iterateNext();
                                   while (property) {
                                       var propertyName = property.attributes.getNamedItem("name").value;
                                       result[itemDescriptorName].push(propertyName);
                                       
                                       property = propertyIterator.iterateNext();
                                   }
                                   console.log(itemDescriptorName + ": " + result[itemDescriptorName]);
                                   
                                   itemDescriptor = definitionIterator.iterateNext();
                               }
                           }
                       }
                   }
                }
            }
          };
        req.send(null);
        
    };
    
    this._findLinkToRepositoryDefinition = function (document) {
        var iterator = document.evaluate(this._linkToRepositoryDefinitionXPath, document, null, XPathResult.ANY_TYPE, null);

        //link like this should appear once per page
        var link = iterator.iterateNext();
        if (link) {
            link = link.value;
            console.log("Link to the repository definition was found: " + link);
        }
        
        return link;
    };
    
    this.processPage(document);
};

function handleStartParse(footprint) {
    var parser = new RepositoryDefinitionParser(document);
    parser.result.footprint = footprint;
    self.port.emit("parse-done", parser.result);
}

self.port.on("start-parse", handleStartParse);