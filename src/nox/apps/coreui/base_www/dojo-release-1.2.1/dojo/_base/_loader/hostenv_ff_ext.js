// a host environment specifically built for Mozilla extensions, but derived
// from the browser host environment
if(typeof window != 'undefined'){
	dojo.isBrowser = true;
	dojo._name = "browser";


	// FIXME: PORTME
	//	http://developer.mozilla.org/en/mozIJSSubScriptLoader


	// attempt to figure out the path to dojo if it isn't set in the config
	(function(){
		var d = dojo;
		// this is a scope protection closure. We set browser versions and grab
		// the URL we were loaded from here.

		// FIXME: need to probably use a different reference to "document" to get the hosting XUL environment

		d.baseUrl = d.config.baseUrl;

		// fill in the rendering support information in dojo.render.*
		var n = navigator;
		var dua = n.userAgent;
		var dav = n.appVersion;
		var tv = parseFloat(dav);

		d.isMozilla = d.isMoz = tv;
		if(d.isMoz){
			d.isFF = parseFloat(dua.split("Firefox/")[1]) || undefined;
		}

		// FIXME
		var cm = document.compatMode;
		d.isQuirks = cm == "BackCompat" || cm == "QuirksMode";

		// FIXME
		// TODO: is the HTML LANG attribute relevant?
		d.locale = dojo.config.locale || n.language.toLowerCase();

		d._xhrObj = function(){
			return new XMLHttpRequest();
		}

		// monkey-patch _loadUri to handle file://, chrome://, and resource:// url's
		var oldLoadUri = d._loadUri;
		d._loadUri = function(uri, cb){
			var handleLocal = ["file:", "chrome:", "resource:"].some(function(prefix){
				return String(uri).indexOf(prefix) == 0;
			});
			if(handleLocal){
				// see:
				//		http://developer.mozilla.org/en/mozIJSSubScriptLoader
				var l = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
					.getService(Components.interfaces.mozIJSSubScriptLoader);
				l.loadSubScript(uri, d.global)
				if(cb){ cb(value); }
				return true;
			}else{
				// otherwise, call the pre-existing version
				return oldLoadUri.apply(d, arguments);
			}
		}

		// FIXME: PORTME
		d._isDocumentOk = function(http){
			var stat = http.status || 0;
			return (stat >= 200 && stat < 300) || 	// Boolean
				stat == 304 || 						// allow any 2XX response code
				stat == 1223 || 						// get it out of the cache
				(!stat && (location.protocol=="file:" || location.protocol=="chrome:") ); // Internet Explorer mangled the status code
		}

		// FIXME: PORTME
		// var owloc = window.location+"";
		// var base = document.getElementsByTagName("base");
		// var hasBase = (base && base.length > 0);
		hasBase = false;

		d._getText = function(/*URI*/ uri, /*Boolean*/ fail_ok){
			// summary: Read the contents of the specified uri and return those contents.
			// uri:
			//		A relative or absolute uri. If absolute, it still must be in
			//		the same "domain" as we are.
			// fail_ok:
			//		Default false. If fail_ok and loading fails, return null
			//		instead of throwing.
			// returns: The response text. null is returned when there is a
			//		failure and failure is okay (an exception otherwise)

			// alert("_getText: " + uri);

			// NOTE: must be declared before scope switches ie. this._xhrObj()
			var http = this._xhrObj();

			if(!hasBase && dojo._Url){
				uri = (new dojo._Url(uri)).toString();
			}
			if(d.config.cacheBust){
				//Make sure we have a string before string methods are used on uri
				uri += "";
				uri += (uri.indexOf("?") == -1 ? "?" : "&") + String(d.config.cacheBust).replace(/\W+/g,"");
			}
			var handleLocal = ["file:", "chrome:", "resource:"].some(function(prefix){
				return String(uri).indexOf(prefix) == 0;
			});
			if(handleLocal){
				// see:
				//		http://forums.mozillazine.org/viewtopic.php?p=921150#921150
				var ioService = Components.classes["@mozilla.org/network/io-service;1"]
					.getService(Components.interfaces.nsIIOService);
				var scriptableStream=Components
					.classes["@mozilla.org/scriptableinputstream;1"]
					.getService(Components.interfaces.nsIScriptableInputStream);

				var channel = ioService.newChannel(uri, null, null);
				var input = channel.open();
				scriptableStream.init(input);
				var str = scriptableStream.read(input.available());
				scriptableStream.close();
				input.close();
				return str;
			}else{
				http.open('GET', uri, false);
				try{
					http.send(null);
					// alert(http);
					if(!d._isDocumentOk(http)){
						var err = Error("Unable to load "+uri+" status:"+ http.status);
						err.status = http.status;
						err.responseText = http.responseText;
						throw err;
					}
				}catch(e){
					if(fail_ok){ return null; } // null
					// rethrow the exception
					throw e;
				}
				return http.responseText; // String
			}
		}
		
		d._windowUnloaders = [];
		
		// FIXME: PORTME
		d.windowUnloaded = function(){
			// summary:
			//		signal fired by impending window destruction. You may use
			//		dojo.addOnWIndowUnload() or dojo.connect() to this method to perform
			//		page/application cleanup methods. See dojo.addOnWindowUnload for more info.
			var mll = this._windowUnloaders;
			while(mll.length){
				(mll.pop())();
			}
		}

		// FIXME: PORTME
		d.addOnWindowUnload = function(/*Object?*/obj, /*String|Function?*/functionName){
			// summary:
			//		registers a function to be triggered when window.onunload fires.
			//		Be careful trying to modify the DOM or access JavaScript properties
			//		during this phase of page unloading: they may not always be available.
			//		Consider dojo.addOnUnload() if you need to modify the DOM or do heavy
			//		JavaScript work.
			// example:
			//	|	dojo.addOnWindowUnload(functionPointer)
			//	|	dojo.addOnWindowUnload(object, "functionName")
			//	|	dojo.addOnWindowUnload(object, function(){ /* ... */});
	
			d._onto(d._windowUnloaders, obj, functionName);
		}
	})();

	dojo._initFired = false;
	//	BEGIN DOMContentLoaded, from Dean Edwards (http://dean.edwards.name/weblog/2006/06/again/)
	dojo._loadInit = function(e){
		dojo._initFired = true;
		// allow multiple calls, only first one will take effect
		// A bug in khtml calls events callbacks for document for event which isnt supported
		// for example a created contextmenu event calls DOMContentLoaded, workaround
		var type = (e && e.type) ? e.type.toLowerCase() : "load";
		if(arguments.callee.initialized || (type != "domcontentloaded" && type != "load")){ return; }
		arguments.callee.initialized = true;
		if(dojo._inFlightCount == 0){
			dojo._modulesLoaded();
		}
	}

	dojo._fakeLoadInit = function(){
		dojo._loadInit({type: "load"});
	}

	/*
	(function(){
		var _w = window;
		var _handleNodeEvent = function(evtName, fp){
			// summary:
			//		non-destructively adds the specified function to the node's
			//		evtName handler.
			// evtName: should be in the form "onclick" for "onclick" handlers.
			// Make sure you pass in the "on" part.
			var oldHandler = _w[evtName] || function(){};
			_w[evtName] = function(){
				fp.apply(_w, arguments);
				oldHandler.apply(_w, arguments);
			};
		};
		// FIXME: PORT
		// FIXME: dojo.unloaded requires dojo scope, so using anon function wrapper.
		_handleNodeEvent("onbeforeunload", function() { dojo.unloaded(); });
		_handleNodeEvent("onunload", function() { dojo.windowUnloaded(); });
	})();
	*/
	

	//	FIXME: PORTME
	// 		this event fires a lot, namely for all plugin XUL overlays and for
	// 		all iframes (in addition to window navigations). We only want
	// 		Dojo's to fire once..but we might care if pages navigate. We'll
	// 		probably need an extension-specific API
	if(!dojo.config.afterOnLoad){
		window.addEventListener("DOMContentLoaded",function(e){ 
			dojo._loadInit(e);
			// console.debug("DOM content loaded", e);
		}, false);
	}

} //if (typeof window != 'undefined')

//Register any module paths set up in djConfig. Need to do this
//in the hostenvs since hostenv_browser can read djConfig from a
//script tag's attribute.
(function(){
	var mp = dojo.config["modulePaths"];
	if(mp){
		for(var param in mp){
			dojo.registerModulePath(param, mp[param]);
		}
	}
})();

//Load debug code if necessary.
if(dojo.config.isDebug){
	// logging stub for extension logging
	console.log = function(m){
		var s = Components.classes["@mozilla.org/consoleservice;1"].getService(
			Components.interfaces.nsIConsoleService
		);
		s.logStringMessage(m);
	}
	console.debug = function(){
		console.log(dojo._toArray(arguments).join(" "));
	}
}
