//Created by Aran Khanna All Rights Reserved

// Global Variables
    // Venmo feed data endpoint
    var endpoint_url = "https://venmo.com/api/v5/users/*";
    // Number of Requests Fired
    var async_reqs = 0

// The Logic
    // Grabs all outgoing async requests from web pages to the facebook messages endpoint_url
    chrome.webRequest.onBeforeRequest.addListener(
        function(details) {
            // Get endpoint (user) being requested
            sendRequest(details.tabId, details.url);
        },
        {urls: [endpoint_url]},
        ['requestBody']
    );

    // Check whether new version is installed and show a help screen
    chrome.runtime.onInstalled.addListener(function(details) {
        if(details.reason == "install"){
            console.log("This is a first install");
            chrome.tabs.create({url: "./html/help.html"});
        }else if(details.reason == "update"){
            var thisVersion = chrome.runtime.getManifest().version;
            console.log("Updated from " + details.previousVersion + " to " + thisVersion);
        }
    });


    // Sends command to make async request to the given tab id (which should be a facebook messages tab) 
    function sendRequest(tabId, url) {
        // Add timeout to allow content script to load also possible race condition between concurrent requests
        // added randomness to probabalistically compensate (dont wanna build a full locking infrastructure).
        setTimeout(function() {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                async_reqs++;
                console.log("passing request body to content script "+async_reqs);
                chrome.tabs.sendMessage(tabId, {url: url}, function(response) {
                    console.log("script executed");
                });
            });
        }, (Math.random()*100)+1000);
    }
