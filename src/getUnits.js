import isMobile from "./utils/mobile";

/**
 * Function to filter out ad units based on device, element existence, and page type
 *
 * @param {string|object} unit Unit name or unit object
 * @return {boolean} whether ad is compatible with current page
 */
function adFilterFunction(unit){
	const adUnitObj = typeof unit === "string" ? window.dataObj.adUnits[unit] : unit;
	const adFilterResult = (typeof adUnitObj.pageTypes === "undefined" || adUnitObj.pageTypes.indexOf(window.dataObj.pageType) > -1)
		&& (typeof adUnitObj.devices === "undefined" || adUnitObj.devices.indexOf(isMobile() ? 'mobile' : 'desktop') > -1)
		&& document.getElementById(adUnitObj.elementId || adUnitObj.name)
		&& adUnitObj.sizes.length >= 1;
	if(!adFilterResult && window.location.href.indexOf('ad-debug') > -1){
		console.log("Ads: Excluding ad unit", adUnitObj, {
			matchesPageType: (typeof adUnitObj.pageTypes === "undefined" || adUnitObj.pageTypes.indexOf(window.dataObj.pageType) > -1),
			matchesDevice: (typeof adUnitObj.devices === "undefined" || adUnitObj.devices.indexOf(isMobile() ? 'mobile' : 'desktop') > -1),
			hasElement: document.getElementById(adUnitObj.elementId || adUnitObj.name),
			hasSizes: adUnitObj.sizes.length >= 1
		});
	}
	return adFilterResult;
}
/**
 * Processes the configuration for the ad unit.
 *
 * @param {string|object} unit Unit name or unit object
 * @return {object} Unit object
 */
function processConfig(unit){
	let adUnitObj = unit;
	if(typeof unit === "string"){
		adUnitObj = window.dataObj.adUnits[unit];
	} else if(typeof unit === "object" && typeof unit.inherit === "string"){
		adUnitObj = {...window.dataObj.adUnits[unit.inherit], ...unit};
	}
	// If element id is not set, set it to the unit name
	if(!adUnitObj.elementId){
		adUnitObj.elementId = adUnitObj.name;
	}
	adUnitObj.element = document.getElementById(adUnitObj.elementId);
	adUnitObj.designation = window.dataObj.adUnits[adUnitObj.elementId] ? adUnitObj.elementId : adUnitObj;
	if(adUnitObj.element && adUnitObj.element.dataset){
		const datasetToMerge = Object.assign({}, adUnitObj.element.dataset);
		if(datasetToMerge.targeting){
			datasetToMerge.targeting = JSON.parse(datasetToMerge.targeting);
		}
		if(datasetToMerge.pageTargeting){
			datasetToMerge.pageTargeting = JSON.parse(datasetToMerge.pageTargeting);
		}
		if(datasetToMerge.sizes){
			datasetToMerge.sizes = JSON.parse(datasetToMerge.sizes);
		}
		adUnitObj = Object.assign(adUnitObj, datasetToMerge);
		delete adUnitObj.adUnit;
	}
	// Apply page type overrides
	if(adUnitObj.pageTypeOverrides && adUnitObj.pageTypeOverrides[window.dataObj.pageType]){
		adUnitObj = Object.assign(adUnitObj, adUnitObj.pageTypeOverrides[window.dataObj.pageType]);
	}
	if(adUnitObj.element){
		const parentNodeWidth = adUnitObj.element.parentNode.offsetWidth;
		adUnitObj.sizes = adUnitObj.sizes.filter(size => size[0] <= parentNodeWidth);
	}
	return adUnitObj;
}
/**
 * Tracking variable for incrementing ad unit ids
 *
 * @type {object}
 */
const adIncrements = {};
/**
 * Automatically increments the ad unit id if it already exists
 *
 * @param {HTMLElement} el HTML element for ad unit
 * @return {string} element id
 */
function applyIncrement(el){
	const incAdUnitId = el.getAttribute('data-inherit');
	const currentIncrement = (adIncrements[incAdUnitId] || 0) + 1;
	adIncrements[incAdUnitId] = currentIncrement;
	const newId = incAdUnitId + currentIncrement;
	el.setAttribute('id', newId);
	return newId;
}
/**
 * Sorts ad units by element top offset
 *
 * @param {object} a Ad unit object
 * @param {object} b Ad unit object
 * @return {number} sort order
 */
function elementTopSort(a, b){
	const posDiff = a.element.getBoundingClientRect().top - b.element.getBoundingClientRect().top;
	return posDiff > 0 ? 1 : -1;
}
/**
 * Gets all ad units compatible with the current page.
 *
 * @return {object} Lazy loaded and nonlazy loaded ad units
 */
export function getCurrentPageUnits(){
	const configuredUnits = Object.keys(window.dataObj.adUnits);
	const dynamicUnits = Array.from(document.querySelectorAll('[data-ad-unit]')).map(function(el){
		let elId = el.id;
		if(!elId){
			elId = applyIncrement(el);
		}
		return Object.assign({}, el.dataset, {
			name: elId,
			elementId: elId,
			dynamic: true
		});
	})
	const allPredefinedUnits = [...configuredUnits, ...dynamicUnits];
	const resultUnitsNotLazy = [];
	const resultUnitsLazy = [];
	const allUnits = [];
	const unusedAdUnits = [];
	for (let index = 0; index < allPredefinedUnits.length; index++) {
		const predefinedUnit = processConfig(allPredefinedUnits[index]);
		if(adFilterFunction(predefinedUnit)){
			let isLazyLoaded = false;
			if(typeof predefinedUnit.lazyLoad !== "undefined"){
				isLazyLoaded = predefinedUnit.lazyLoad;
			} else {
				isLazyLoaded = predefinedUnit.element.getBoundingClientRect().top - window.innerHeight < 500;
			}
			if(isLazyLoaded){
				resultUnitsLazy.push(predefinedUnit);
			} else {
				resultUnitsNotLazy.push(predefinedUnit);
			}
			allUnits.push(predefinedUnit);
		} else if(document.getElementById(predefinedUnit.elementId || predefinedUnit.name)){
			predefinedUnit.element = document.getElementById(predefinedUnit.elementId || predefinedUnit.name);
			unusedAdUnits.push(predefinedUnit);
		}
	}
	return {
		refreshUnits: resultUnitsNotLazy.sort(elementTopSort),
		lazyLoadUnits: resultUnitsLazy.sort(elementTopSort),
		allUnits: allUnits.sort(elementTopSort),
		unusedAdUnits: unusedAdUnits
	};
}