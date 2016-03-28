var ItemsListParser = function (document) {
    this.result = new Object();
    this.result.data = new Array();
    this._itemNameXPath = '/html/body/p[position()<8]/table/tbody/tr[position()>2]/th';

    this._parse = function (document) {
        var iterator = document.evaluate(this._itemNameXPath, document, null, XPathResult.ANY_TYPE, null);

        try {
            var thisNode = iterator.iterateNext();

            while (thisNode) {
                this.result.data.push(thisNode.childNodes[0].nodeValue);
                thisNode = iterator.iterateNext();
            }
            console.log ("Page was proccessed; " + this.result.length + " items were found");
        } catch (e) {
            dump('Error: Document tree modified during iteration ' + e);
        }
    };

    this._parse(document);
};

function handleStartParse(footprint) {
    var parser = new ItemsListParser(document);
    parser.result.footprint = footprint;
    self.port.emit("parse-done", parser.result);
}

self.port.on("start-parse", handleStartParse);

