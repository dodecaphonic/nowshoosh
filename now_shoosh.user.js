// Now shoosh!, v0.6
// Copyright (c) 2008-2009, Vitor Peres
// Released under the GPL license
// http://www.gnu.org/copyleft/gpl.html
// Updated: Thu May 28 20:11:26 2009
//
// ==UserScript==
// @name           Now shoosh!
// @namespace      http://userscripts.org/scripts/show/33629
// @description    A boon to twitter sanity, "Now shoosh!" allows you to mute people you don't really wanna read right now.
// @include        http://twitter.com/*
// @include        https://twitter.com/*
// ==/UserScript==

(function(realWindow) {
   var Cookie = {
     PREFIX:'_greasekit',
     get: function(name, defaultValue) {
       var nameEQ = escape(Cookie._buildName(name)) + "=", ca =
         document.cookie.split(';');
       for (var i = 0, c; i < ca.length; i++) {
         c = ca[i];
         while (c.charAt(0) == ' ') c = c.substring(1, c.length);
         if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
       }
       return defaultValue;
     },
     set: function(name, value, options){
       options = (options || {});
       if (options.expiresInOneYear) {
         var today = new Date();
         today.setFullYear(today.getFullYear()+1, today.getMonth, today.getDay());
         options.expires = today;
       }
       var curCookie = escape(Cookie._buildName(name)) + "=" + escape(value) +
         ((options.expires) ? "; expires=" + options.expires.toGMTString() : "") +
         ((options.path)    ? "; path="    + options.path : "") +
         ((options.domain)  ? "; domain="  + options.domain : "") +
         ((options.secure)  ? "; secure" : "");
       document.cookie = curCookie;
     },
     hasCookie: function( name ){
       return document.cookie.indexOf( escape(Cookie._buildName(name)) ) > -1;
     },
     _buildName: function(name){
       return Cookie.PREFIX + '_' + name;
     }

   };

   if(typeof GM_getValue === "undefined") GM_getValue = Cookie.get;
   if(typeof GM_setValue === "undefined") GM_setValue = Cookie.set;

   var jQuery = realWindow.jQuery,
   $ = jQuery;

   var shooshable = {};

   function contactsInTimeline(timeline) {
     return timeline.map(function(i, toot) {
                           return getAuthorName(toot);
                         });
   }

   function getTimeline() {
     return $("#timeline > li");
   }

   function shooshToot(_, toot) {
     toot.style.display = 'none';
   }

   function onShooshContact(contact) {
     shooshContact(contact);
     sayNoMore(contact);
     addContactToShooshedDisplayList(contact, getContactImageURL(contact));
   }

   function shooshContact(contact) {
     var users = retrieveShooshedContacts();
     users.push(contact);
     storeShooshedContacts(users);
   }

   function sayNoMore(contact) {
     filterTootsFromContact(contact).each(shooshToot);
   }

   function makeShooshable(order, toot) {
     if(!shooshable[toot.id]) {
       var body = $("#" + toot.id + " > span:eq(1)")[0];
       var contents = $("#" + toot.id + " > span:eq(1) > span:eq(0)")[0];
       var linkList = $("#" + toot.id + " > span:eq(1) > ul")[0];
       var shooshList = linkList.appendChild(document.createElement("li"));
       var container = shooshList.appendChild(document.createElement('span'));
       var shoosh = container.appendChild(document.createElement('a'));
       shoosh.href = 'javascript:;';
       shoosh.appendChild(document.createTextNode("Shoosh"));
       //shoosh.style.fontSize = 'small';
       shoosh.class = 'reply';
       shoosh.style.paddingLeft = '10px';
       shoosh.addEventListener('click', (function(a) {
                                         return function() { onShooshContact(a); };
                                       })(getAuthorName(toot)), false);
       shooshable[toot.id] = true;
     }
   }

   function getAuthorElement(toot) {
     return $("#" + toot.id + " > span:eq(1) > strong > a")[0];
   }

   function getAuthorName(toot) {
     return getAuthorElement(toot).innerHTML;
   }

   function retrieveShooshedContacts() {
     var users = GM_getValue('shooshedContacts', null);
     return users ? users.split(';') : [];
   }

   function storeShooshedContacts(contacts) {
     GM_setValue('shooshedContacts', contacts.join(';'));
   }

   function isShooshed(contact) {
     var allShooshed = retrieveShooshedContacts();
     return allShooshed.indexOf(contact) != -1;
   }

   function findShooshedInTimeline(contacts) {
     return contacts.filter(function(c) { return isShooshed(contacts[c]); });
   }

   function addContactToShooshedDisplayList(contact, img_url) {
     var list = getShooshedDisplayList();
     var tr   = list.appendChild(document.createElement('tr'));
     var imgcont = tr.appendChild(document.createElement('td'));
     imgcont.setAttribute('class', 'vcard');
     imgcont.setAttribute('valign', 'top');
     var link = imgcont.appendChild(document.createElement('a'));
     link.href = 'http://twitter.com/' + contact;
     var img = link.appendChild(document.createElement('img'));
     img.src = img_url;
     var name = tr.appendChild(document.createElement('td'));
     name.setAttribute('valign', 'top');
     name.appendChild(document.createTextNode(contact));
     var unmcont = tr.appendChild(document.createElement('td'));
     unmcont.setAttribute('valign', 'top');
     var unshoosh  = unmcont.appendChild(document.createElement('a'));
     unshoosh.setAttribute('class', 'section-links');
     unshoosh.href = 'javascript:;';
     unshoosh.addEventListener('click', (function(c) {
                                         return function() {
                                           onUnshooshContact(c);
                                         };
                                       })(contact), false);
     unshoosh.appendChild(document.createTextNode('Unshoosh'));
   }

   function onUnshooshContact(contact) {
     filterTootsFromContact(contact).each(function OUC_showToot(i, t) {
                                               t.style.display = 'block';
                                             });
     removeFromShooshedDisplayList(contact);
     unshooshContact(contact);
   }

   function unshooshContact(contact) {
     var contacts = retrieveShooshedContacts();
     var unshooshed  = contacts.filter(function(c) {
                                         return contact != c;
                                       });
     storeShooshedContacts(unshooshed);
   }

   function removeFromShooshedDisplayList(contact) {
     var entries = $("#shooshed_list > tr");
     var entry   = entries.filter(function(i) {
                                    var row = entries[i];
                                    return row.childNodes[1].innerHTML == contact;
                                  })[0];
     getShooshedDisplayList().removeChild(entry);
   }

   function filterTootsFromContact(contact, toots) {
     toots = toots || getTimeline();
     return toots.filter(function(i) {
                           return getAuthorName(toots[i]) == contact;
                         });
   }

   function getShooshedDisplayList() {
     var pane = $("#shooshed_pane")[0];
     if(pane) {
       return $("#shooshed_pane > #shooshed_list")[0];
     }
     else {
       return createShooshedDisplayList();
     }
   }

   function createShooshedDisplayList() {
     var sidePane = $('#side')[0];
     var pane = sidePane.appendChild(document.createElement('div'));
     pane.id = 'shooshed_pane';
     pane.setAttribute('class', 'section');
     var header = pane.appendChild(document.createElement('div'));
     header.setAttribute('class', 'section-header');
     var title  = header.appendChild(document.createElement('h1'));
     title.appendChild(document.createTextNode("People you've shooshed"));
     var list  = pane.appendChild(document.createElement('table'));
     list.id = 'shooshed_list';
     list.cellPadding = 0;
     list.cellSpacing = 2;
     list.style.width = "100%";
     return list;
   }

   function getContactImageURL(contact, allToots) {
     var img = null;
     allToots = allToots || getTimeline();
     var toots = filterTootsFromContact(contact, allToots);

     if(toots.length > 0) {
       img = $("#" + toots[0].id + " > span:eq(0) > a:eq(0) > img")[0].src;
     }
     else {
       var base = 'http://twitter.com/users/show/';
       var req = new XMLHttpRequest();
       req.open('GET', base + contact + '.json', false);
       req.send(null);
       if(req.status == 200) {
         var details = eval("[" + req.responseText + "]")[0];
         img = details["profile_image_url"];
       }
     }
     img = img.replace(/_normal\./, '_mini.');

     return img;
   }

   function showShooshedList(toots) {
     retrieveShooshedContacts().forEach(function SMC_addToList(c) {
                                          addContactToShooshedDisplayList(c, getContactImageURL(c));
                                     });
   }

   function displayShooshedUserInformation() {
     $(".is-following > strong").after(" (currently Shooshed)");
   }

   // Where the magic happens
   function nowShoosh() {
     var toots = getTimeline();
     toots.each(makeShooshable);
     var shooshed = findShooshedInTimeline(contactsInTimeline(toots));
     shooshed.each(function(c) { sayNoMore(shooshed[c]); });;
     showShooshedList(toots);
   }

   // This is incredibly lazy, but here's the gist: I've tried wrapping
   // the original callback functions for #more and #results_update in a way
   // that whenever they finished new toots would be shooshed, only to end
   // up with complete reloads instead of AJAX-y glory. "You're stupid,"
   // you'll say. Well, I'd never argue that. After hours of looking at stack
   // traces and pressing "Step Into" in Firebug like a mad man, however, I feel
   // that even solving it will be bittersweet, as Twitter can change it
   // at any moment and make me do it all over again.
   // I just bind my own click handlers and set them to wait 3s, just so
   // all the latency in the world can happen and the DOM can take its
   // time. After that, "Shoosh" links will be placed and tweets removed.
   // It's not elegant or pretty, but hey, help me out if you feel like it.
   var location = realWindow.document.location.href;
   if(location.match(/http(s)?:\/\/twitter\.com/)) {
     $("#more").click(function(e) {
                        setTimeout(nowShoosh, 3000);
                      });
     $("#results_update").click(function(e) {
                                  setTimeout(nowShoosh, 3000);
                                });
     nowShoosh();
   } else {
     var subUrl = location.split(/http(s)?:\/\/twitter.com\//)[2];
     var parts  = subUrl.split("/");
     if(parts.length == 1) { // Ok, this is probably an user.
       var contact = parts[0];
       if(isShooshed(contact)) displayShooshedUserInformation();
     }
   }
 })(typeof jQuery == "undefined" ? unsafeWindow : window);
