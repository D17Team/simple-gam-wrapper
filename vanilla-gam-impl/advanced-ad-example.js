var slotConfigs = {
	"mobile-ad-top": {
			"elementId": "mobile-ad-top",
			"sizes": [
					[320, 50],
					[300, 250],
			],
			"targeting": {
				"position": "top"
			},
			"device": ["mobile"],
			"pages": ["home", "article"]
	},
	"mobile-ad-bottom": {
			"elementId": "mobile-ad-bottom",
			"sizes": [
					[320, 50],
					[300, 250],
			],
			"targeting": {
				"position": "bottom"
			},
			"device": ["mobile"],
			"pages": ["home", "article", "slideshow"]
	},
	"mobile-ad-in-content": {
			"elementId": "mobile-ad-in-content",
			"sizes": [
					[320, 50],
					[300, 250],
			],
			"targeting": {
				"position": "in-content"
			},
			"device": ["mobile"],
			"pages": ["home", "article"]
	},
	"ad-top": {
			"elementId": "ad-top",
			"sizes": [
					[728, 90],
					[970, 90],
			],
			"targeting": {
				"position": "top"
			},
			"device": ["desktop"],
			"pages": ["home", "article"]
	},
	"ad-bottom": {
			"elementId": "ad-top",
			"sizes": [
					[728, 90],
					[970, 90],
			],
			"targeting": {
				"position": "bottom"
			},
			"device": ["desktop"],
			"pages": ["home", "article", "slideshow"]
	},
	"ad-in-content": {
			"elementId": "ad-in-content",
			"sizes": [
					[300, 250],
			],
			"targeting": {
				"position": "in-content"
			},
			"device": ["desktop"],
			"pages": ["home", "article"]
	},
}
// old
// var activePageAds = ['mobile-ad-top', 'mobile-ad-in-content', 'mobile-ad-bottom']
// new
var pageType = "article";
var device = "desktop";
var activePageAds = Object.keys(slotConfigs).filter(function(key){
	return slotConfigs[key].pages.indexOf(pageType) > -1 && slotConfigs[key].device.indexOf(device) > -1;
})
var activeSlotConfigurations = activePageAds
	.map(function(key){
		return slotConfigs[key]
	})

var slots = {};
var activeSlots = [];
googletag.cmd.push(function(){
	for (var index = 0; index < activeSlotConfigurations.length; index++) {
		var activeSlotConfig = activeSlotConfigurations[index];
		if(slots[activeSlotConfig.elementId]){ 
			// reuse slot definition if available
			activeSlots.push(slots[activeSlotConfig.elementId]);
		} else if(document.getElementById(activeSlotConfig.elementId)){
			slots[activeSlotConfig.elementId] = googletag.defineSlot(activeSlotConfig.path, activeSlotConfig.sizes, activeSlotConfig.elementId);
			slots[activeSlotConfig.elementId].addService(window.googletag.pubads())
			// new
			if(activeSlotConfig.targeting){
				for(var key in activeSlotConfig.targeting){
					slots[activeSlotConfig.elementId].setTargeting(key, activeSlotConfig.targeting[key]);
				}
			}
			activeSlots.push(slots[activeSlotConfig.elementId]);
		} else {
			console.error('Ads: The element with id "' + activeSlotConfig.elementId + '" does not exist. Cannot define slot.');
		}
	}
})

var gamServicesEnabled = false;
if(!gamServicesEnabled){
	googletag.cmd.push(function(){
		window.googletag.enableServices();
		window.googletag.pubads().enableSingleRequest();
		gamServicesEnabled = true;
	})
}

googletag.cmd.push(function(){
	for (var index = 0; index < activeSlotConfigurations.length; index++) {
		var activeSlotConfig = activeSlotConfigurations[index];
		if(document.getElementById(activeSlotConfig.elementId)){
			googletag.display(activeSlotConfig.elementId);
		} else {
			console.error('Ads: The element with id "' + activeSlotConfig.elementId + '" does not exist. Cannot display slot.');
		}
	}
})

googletag.cmd.push(function(){
	googletag.pubads().refresh(activeSlots);
	activeSlots = [];
})

// googletag.cmd.push(function(){
// 	// Setting page level targeting
// 	googletag.pubads().setTargeting('category', 'tvshows');
// 	// Setting unit level targeting
// 	slots['mobile-ad-top'].setTargeting('position', 'top');
// })

// googletag.cmd.push(function(){
// 	// Clearing page level targeting
// 	googletag.pubads().clearTargeting('category');
// 	// Clearing unit level targeting
// 	slots['mobile-ad-top'].clearTargeting('position');

// 	// Clear ALL page level targeting
// 	googletag.pubads().clearTargeting();
// 	// Clear ALL unit level targeting
// 	slots['mobile-ad-top'].clearTargeting();
// })

// googletag.cmd.push(function(){
// 	// Replaces with blank content and marks as unfetched
// 	googletag.pubads().clear([slots['mobile-ad-bottom']]);
// 	// Removes the slot from the page and clears internal state for this unit managed in GPT
// 	googletag.destroySlots([slots['mobile-ad-bottom']]);
// })
