# Money Trail

##How do I install this?
You can get this extension on the Chrome webstore here: https://chrome.google.com/webstore/detail/money-trail/pfapkinkogbekmajdmmdiificmnkeflm

To install this extension from source simply download it as a zip file and unzip it somewhere on your computer. Go to chrome://extensions, ensure that Developer Mode is enabled and click "Load unpacked extension...". Navigate to the root folder (which contains manifest.json) and select it. For a sligtly more detailed walkthrough look here: https://www.mattcutts.com/blog/how-to-install-a-chrome-extension-from-github/

##Where did this come from?
This chrome extension was developed to accompany this Medium post (https://medium.com/@arankhanna/d3676d624310) and this paper (http://techscience.org/a/2015102801/). It is meant as a demonstration of how much transaction data Venmo defaults users into sharing through its increasingly popular mobile payment app.

##What does this code do?
A video demonstration of the code is available here: https://youtu.be/R-sNnLUXuNI

This code runs on any user's newsfeed page on https://venmo.com/ (once the extension user is logged into the site). It aggregates all the available transaction data for that user and provide a chart as well as a bubble graph visualization on top of it.

This is not meant to be used as a tool to creep on your friends, rather a demonstration of the scary amount of information you can gather on someone just by looking through their Venmo transactions. Furthermore it is important to note that this extension is simply automating the process of gathering and plotting public data, which can be even done with a pencil and a piece of paper.

You can review the source code here to see how it works. Most of the action happens in src/bg which has the background javascript file for the extension and src/venmo which has the content script which runs on venmo's site. You can see that none of the data scraped by this extension ever leaves your local browser.

