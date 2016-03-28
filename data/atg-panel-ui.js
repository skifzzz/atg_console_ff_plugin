//var consoleDomNode = document.getElementById("console");
//alert(consoleDomNode);
//var response = document.getElementById("response");

//consoleDomNode.addEventListener("keyup", send, false);
//alert(ATGConsole);
//var builder = require("prefixtree/PrefixTreeBuilder");
//alert("builder " + builder);



var acController = new ACPopupController("ACItemsContainer","ACItemsList","ACItem");
acController.init();
acController.show();
var consoleController = new ConsoleController("console",acController);
consoleController.init();
consoleController._keyboardControl(null);

window.addEventListener("message",function (event) {consoleController.listener(event)});
window.addEventListener("found",function (event) {consoleController.listener(event)});

function send(event) {
     // request.value = "submitted";
  if ((event.keyCode == 13) && (event.getModifierState("Control") == true)) {
      alert("submitted");
//    window.port.postMessage(JSON.parse(request.value));
  }
}

function receive(event) {
  response.textContent = JSON.stringify(event.data, undefined, 2);
}

function ConsoleController(consoleElementId, popupController) {
    this.separatorList = [" ", "\r", "\t", "\n"];
    this.consoleElementId = consoleElementId;
    this.consoleNode = null;
    this.waiting = false;
    this.waitingTimerStarted = false;
    this.acController = popupController;
    this.autoCompletePipeline = null;
    this.xmlQueryPipeline = null;
    
    this._keyboardControl = function(event) {
        if (event) {
            console.log("ConsoleController: processing " + event.key);
            if(event.key == "ArrowUp") {
                this.acController.moveSelectionUp();
                event.preventDefault();
                return false;
            } else if (event.key == "ArrowDown") {
                this.acController.moveSelectionDown();
                event.preventDefault();
                return false;
            } else if ((event.keyCode == 13) && (event.getModifierState("Control") == true)) {
                this.xmlQueryPipeline.postMessage(this.consoleNode.value.trim());
                console.log("submitted");
          //    window.port.postMessage(JSON.parse(request.value));
            } else if (event.keyCode == 13) {
                this.replaceLastWord();
                this.acController.hide();
                event.preventDefault();
                return false;
            } else if (event.key == " ") {
                this.acController.hide();
            } else {
//                this.consoleNode.value += event.key;
                this.autoCompletePipeline.postMessage(this.getLastWord());
               // acController.show();
                
            }
            this.selectLastWord();
            event.preventDefault();
            return false;
        }
    };
    
    this._getLastSeparatorIndex = function () {
        var consoleValue = this.consoleNode.value;
        var index = 0;
        
        for (var i = 0; i < this.separatorList.length; i++) {
            var separatorIndex = consoleValue.lastIndexOf(this.separatorList[i]);
            if (index < separatorIndex) {
                index = separatorIndex;
            }
            
        }
        
        return index;
    };
    
    this.selectLastWord = function () {
        var lsi = this._getLastSeparatorIndex();
        
        this.consoleNode.setSelectionRange(lsi == 0 ? lsi : (lsi + 1), this.consoleNode.value.length);
    };
    
    this.getLastWord = function () {
        var lsi = this._getLastSeparatorIndex();
        return this.consoleNode.value.substring(lsi == 0 ? lsi : (lsi + 1), this.consoleNode.value.length).trim();
    };
    
    this.replaceLastWord = function () {
        if (this.acController.current) {
            var value = this.consoleNode.value.trim();
            var lsi = this._getLastSeparatorIndex();
            if (lsi != 0) {
                value = value.substring(0,lsi + 1);
                value = value + this.acController.current.text + ' ';
            } else {
                value = acController.current.text + ' ';
            }
            this.consoleNode.value = value;
        }
    };
    
    this.init = function () {
        var self = this;
        
        self.consoleNode = document.getElementById(consoleElementId);
        self.consoleNode.addEventListener("keyup", function (event) {self._keyboardControl(event)}, false);
        
        self.consoleNode.addEventListener("keydown", function(e){
            if (e.keyCode == 13) {
                e.preventDefault();
                return false;
            } else if(e.key == "ArrowUp") {
                e.preventDefault();
                return false;
            } else if (e.key == "ArrowDown") {
                e.preventDefault();
                return false;
            } else {
                self.consoleNode.setSelectionRange(self.consoleNode.value.length,self.consoleNode.value.length);
            }
        }, false);
    };
    
    
    this._handleACResults = function(event) {
        this.acController.init(event.data);
        this.acController.show();
    };
    
    this.listener = function (event) {
        var self = this;
        if (event.data.indexOf("CHANNEL_FIND_IN_TRIE") != -1) {
            this.autoCompletePipeline = event.ports[0];
            this.autoCompletePipeline.start();
            this.autoCompletePipeline.onmessage = function (event) {
                self._handleACResults(event);
            };
            console.log("Port for CHANNEL_FIND_IN_TRIE was initialized");
        } else if (event.data.indexOf("CHANNEL_XML_QUERY") != -1) {
            this.xmlQueryPipeline = event.ports[0];
            this.xmlQueryPipeline.start();
        } else {
            console.error(event.data + " is not supported message");
        }
    };
    
    
};

function ACPopupController (acContainerId, itemsListId, itemClass) {
    this.mainContainerId = acContainerId;
    this.itemsListId = itemsListId;
    this.itemClass = itemClass;
    this.current = null;
    this.isShown = false;
    
    this.init = function (textValues) {
        var self = this;
        var _attachMakeCurrent = function (event) {
            self._makeCurrent(event);
        };
        var _attachClearSelection = function (event) {
            self._clearSelection(event);
        };
        this.popupDomNode = document.getElementById(this.mainContainerId);
        this.itemsListNode = document.getElementById(this.itemsListId);
        if (textValues) {
            this.items = document.getElementsByClassName(this.itemClass);
            if (this.items.length > textValues.length){
                for (var i = textValues.length; i < this.items.length; i++) {
                    if (this.items[i].className.indexOf("hidden") == -1) {
                        this.items[i].className += this.items[i].className ? ' hidden' : 'hidden';
                    }
                    this.items[i].removeEventListener("mouseenter", _attachMakeCurrent);
                    this.items[i].removeEventListener("mouseleave", _attachClearSelection);
                }
            }
            
            
            var itemsLength = this.items.length;
            for(var i = 0; i < textValues.length; i++) {
                if (i >= itemsLength) {
                    var li = document.createElement('li'),
                    text = document.createTextNode(textValues[i]);

                    li.appendChild(text);
                    li.className = "ACItem";
                    this.itemsListNode.appendChild(li);
//                    this.items.push(li);
                } else {
                    this.items[i].className = "ACItem";
                    this.items[i].text = textValues[i];
                    this.items[i].innerHTML = textValues[i];
                }
                
                
                this.items[i].addEventListener("mouseenter", _attachMakeCurrent, false);
                this.items[i].addEventListener("mouseleave", _attachClearSelection, false);
            }
            if (this.current) {
                this.current = null;
            }
        }
        
    },
            
    this._makeCurrent = function (event) {
        if (this.current) {
            this.current.classList.remove("current");
        }
//        if (this.current !== event.currentTarget) {
//            alert("different");
//        }
//        //pretty stupid if, end-of-day solution
//        if (this.current && this.current !== event.currentTarget) {
//            this.current.classList.remove("current");
//            alert(this.current.classList);
//        }
//        if (!this.current || this.current !== event.currentTarget) {
            this.current = event.currentTarget;
            this.current.classList.add("current");
            event.relatedTarget.classList.remove("current");
//        }
    },
            
    this.selectDefault = function () {
        var defaultItem = this._foundFirstVisibleItem();
        if (defaultItem) {
            this.current = defaultItem;
            this.current.classList.add("current");
        }
    },
    
    this._clearSelection = function (event) {
        if (this.current) {
//            this.current.classList.remove("current");
//            alert(this.current.classList);
        }
    },
    
    this.moveSelectionUp = function() {
        if (this.current) {
            var upperElement = this.current.previousElementSibling;
            while (upperElement && upperElement.className.indexOf('hidden') != -1) {
                upperElement = upperElement.previousElementSibling;
            }
            if (upperElement) {
                this.current.classList.remove("current");
                this.current = upperElement;
                this.current.classList.add("current");
            }
        }
    },
    
    this.moveSelectionDown = function() {
        if (this.current) {
            var lowerElement = this.current.nextElementSibling;
            while (lowerElement && lowerElement.className.indexOf('hidden') != -1) {
                lowerElement = lowerElement.nextElementSibling;
            }
            if (lowerElement) {
                this.current.classList.remove("current");
                this.current = lowerElement;
                this.current.classList.add("current");
            }
        }
    },
    
    this.show = function() {
        console.log("try to show popup");
        console.log("this.popupDomNode" + this.popupDomNode);
        //console.log("popupDomNode" + popupDomNode);
        console.log("this.isShown" + this.isShown);
        if (!this.isShown) {
            this.popupDomNode.style.display = "block";
            this.isShown = true;
            this.selectDefault();
        } else if (!this.current){
            this.selectDefault();
        }
    },
    
    this.hide = function() {
        console.log("try to hide popup");
        console.log("this.popupDomNode" + this.popupDomNode);
       // console.log("popupDomNode" + popupDomNode);
        console.log("this.isShown" + this.isShown);
        
        this.popupDomNode.style.display = "none";
        this.isShown = false;
        if (this.current) {
            this.current.classList.remove("current");
            this.current = null;
        }
    };
    
    this._foundFirstVisibleItem = function() {
        var visibleItem = null;
        if (this.items) {
            for (var i = 0; i < this.items.length; i++) {
                if (this.items[i].className.indexOf("hidden") == -1) {
                    visibleItem = this.items[i];
                    break;
                }
            }
        }
        
        return visibleItem;
    };
}

function QueryResultController (resultElementId) {
    this.resultElementId = resultElementId;
    
    this.init = function(){
        
    };
    
}

