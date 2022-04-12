import isMobile from "./utils/mobile";
import { formatReferrer } from "./utils/url";
import gamWrapper from "./gamWrapper";
import { getCurrentPageUnits } from "./getUnits";
import "./autoWrapper.css";
/**
 * Ads implementation
 *
 * @returns {object} Ads API object
 * @namespace autoWrapper
 */
const autoWrapper = (function(){
	/**
	 * Page data object
	 *
	 * @type {object}
	 * @memberof autoWrapper
	 * @private
	 */
	let pageData = {};
	/**
	 * Configuration for ads on site
	 *
	 * @type {object}
	 * @memberof autoWrapper
	 * @private
	 */
	let config = {
		reserveSpace: false,
	}
	/**
	 * Object tracking auctioned units to allow detection of newly added units.
	 *
	 * @type {object}
	 * @memberof autoWrapper
	 * @private
	 */
	const auctionedUnits = {};
	/**
	 * Intersection observer for lazy loading ads
	 *
	 * @type {object}
	 * @memberof autoWrapper
	 * @private
	 */
	let lazyLoadObserver = {};

	/**
	 * Object for tracking lazy loaded designations
	 * @memberof autoWrapper
	 * @private
	 */
	const lazyUnits = {};
	/** 
	 * Object for tracking popular sizes for size reservation.
	 * 
	 * @memberof autoWrapper
	 * @private
	 */
	const popularSizes = {
		'300x250': 1,
		'320x50': 2,
		'728x90': 3,
		'160x600': 4,
		'970x250': 5,
		'970x90': 6
	}
	/**
	 * Set page targeting form page data
	 *
	 * @memberof autoWrapper
	 * @private
	 */
	function setPageTargetingFromPageData(){
			gamWrapper.setPageTargeting({
				ptype: pageData.pageType,
				hitId: pageData.hitId,
				sessionId: pageData.sessionId,
				clientId: pageData.clientId,
				referrer: formatReferrer(document.referrer),
				section: pageData.section
			})
			if(pageData.contentId){
				gamWrapper.setPageTargeting({
					contentId:pageData.contentId,
					authorName:pageData.authorName,
					authorId:pageData.authorId,
					keywords:pageData.keywords,
					testValue:pageData.testValue
				})
			}
	}
	/**
	 * Sets unit configs on gamWrapper
	 *
	 * @memberof autoWrapper
	 * @private
	 */
	function setUnits(){
		gamWrapper.setUnitConfigs(pageData.adUnits);
	}
	/**
	 * Sets the page GAM Path
	 *
	 * @memberof autoWrapper
	 * @private
	 */
	function setGamPath(){
		gamWrapper.setConfig({
			gamPath: isMobile() ? pageData.mobileGamPath : pageData.desktopGamPath
		})
	}
	/**
	 * Method for handling class application to elements
	 *
	 * @param {Object} classes Object with remove and add keys the values can be an array or object of key/booleans
	 * @param {HTMLElement} el Element to apply classes to, parentNode as well.
	 */
	function applyClasses(classes, el){
		if(!!config.applyClasses){
			const {add, remove} = classes;
			if(remove && Array.isArray(remove)) {
				for (let index = 0; index < remove.length; index++) {
					const klass = remove[index];
					el.classList.remove(klass);
					el.parentNode.classList.remove(klass);
				}
			} else if(remove && typeof remove === "object") {
				for (const klass in remove) {
					if(remove.hasOwnProperty(klass) && !!remove[klass]){
						el.classList.remove(klass);
						el.parentNode.classList.remove(klass);
					}
				}
			}
			if(add && Array.isArray(add)){
				for (let index = 0; index < add.length; index++) {
					const klass = add[index];
					if(!Array.isArray(config.applyClasses) || (Array.isArray(config.applyClasses) && config.applyClasses.indexOf(klass) >= 0)){
						el.classList.add(klass);
						el.parentNode.classList.add(klass);
					}
				}
			} else if(add && typeof add === "object"){
				for (const klass in add) {
					if(add.hasOwnProperty(klass) && !!add[klass]){
						if(!Array.isArray(config.applyClasses) || (Array.isArray(config.applyClasses) && config.applyClasses.indexOf(klass) >= 0)){
							el.classList.add(klass);
							el.parentNode.classList.add(klass);
						}
					}
				}
			}
		}
	}
	/**
	 * Sets up event listeners for styling ad unit divs and containers
	 *
	 * @memberof autoWrapper
	 * @private
	 */
	function setupEventListeners(){
		const elClassesToRemove = [
			'sgw-processing',
			'sgw-processed',
			'sgw-rendered',
			'sgw-unused',
			'sgw-empty',
			'sgw-blocked'
		]
		window.googletag.cmd.push(function(){
			window.googletag.pubads().addEventListener('slotRenderEnded', function(event){
				const el = 	window.document.getElementById(event.slot.getSlotElementId())
				applyClasses({
					remove: {
						'sgw-processing': true,
						'sgw-blocked': true
					},
					add: {
						'sgw-rendered': !event.isEmpty,
						'sgw-empty': event.isEmpty,
					}
				}, el);
				if(config.reserveSpace){
					el.style.height = event.size[1] + 'px';
					el.parentNode.style.minHeight = event.size[1] + 'px';
					el.style.width = event.size[0] + 'px';
					el.parentNode.style.minWidth = event.size[0] + 'px';
				}
			})
		})
		window.googletag.cmd.push(function(){
			window.googletag.pubads().addEventListener('slotRequested', function(event){
				const el = 	window.document.getElementById(event.slot.getSlotElementId());
				applyClasses({
					remove: elClassesToRemove
				}, el);
			})
		})
	}
	/**
	 * Initializes all ads processes
	 *
	 * @memberof autoWrapper
	 */
	function init(passedConfig){
		config = passedConfig;
		pageData = config.pageData || window.dataObj;
		lazyLoadObserver = new IntersectionObserver(
			lazyLoadAd,
			config.lazyLoadOptions || { rootMargin: '500px 0px', threshold: 0.01 }
		)
		if(!pageData){
			throw new Error("Ads: Page Data(window.dataObj) does not exist.");
		}
		setupEventListeners();
		setPageTargetingFromPageData();
		setUnits();
		setGamPath();
		const { refreshUnits, lazyLoadUnits, allUnits, unusedAdUnits } = getCurrentPageUnits();
		postProcessUnits(refreshUnits, lazyLoadUnits, allUnits, unusedAdUnits);
	}
	/**
	 * Method for refreshing new units on the page for infinite scroll situations
	 *
	 * @param {Array<string|object>} units
	 * @memberof autoWrapper
	 */
	function refresh(units){
		const {refreshUnits, lazyLoadUnits, allUnits, unusedAdUnits } = getCurrentPageUnits();
		const omitNonNewUnits = unit => units.indexOf(unit.elementId) > -1 || (unit.dynamic && !auctionedUnits[unit.elementId])
		const newRefreshUnits = refreshUnits.filter(omitNonNewUnits).map(unit => {
			if(unit.pageTargeting){
				gamWrapper.setPageTargeting(unit.pageTargeting);
			}
			return unit.designation
		});
		const newLazyLoadUnits = lazyLoadUnits.filter(omitNonNewUnits);
		postProcessUnits(newRefreshUnits, newLazyLoadUnits, allUnits.filter(omitNonNewUnits), unusedAdUnits);
	}
	/**
	 * Handles post processing of ad units
	 *
	 * @param {Object[]} refreshUnits Units to refresh immediately
	 * @param {Object[]} lazyLoadUnits Units to lazy load
	 * @param {Object[]} allUnits All units for size reservation and class applicaiton
	 * @param {Object[]} unusedAdUnits Unused ad units on page
	 * @memberof autoWrapper
	 */
	function postProcessUnits(refreshUnits, lazyLoadUnits, allUnits, unusedAdUnits){		console.log("Ads: Refreshing ad units", refreshUnits);
		gamWrapper.refresh(refreshUnits.map(unit => {
			if(unit.pageTargeting){
				gamWrapper.setPageTargeting(unit.pageTargeting);
			}
			return unit.designation;
		}));
		console.log("Ads: Lazy loading ad units", lazyLoadUnits);
		lazyLoad(lazyLoadUnits);

		for (let index = 0; index < allUnits.length; index++) {
			const unit = allUnits[index];
			applyClasses({
				add: ['sgw-processing']
			}, unit.element);
			if(config.reserveSpace){
				const topSize = unit.sizes.sort((a, b) => popularSizes[`${a[0]}x${a[1]}`] > popularSizes[`${b[0]}x${b[1]}`] ? 1 : -1)[0];
				unit.element.style.height = `${topSize[1]}px`;
				unit.element.parentNode.style.minHeight = `${topSize[1]}px`;
				unit.element.style.width = `${topSize[0]}px`;
				unit.element.parentNode.style.minWidth = `${topSize[0]}px`;
			}
			setTimeout(() => {
				console.log("Ads: checking for blocked", unit.element.childNodes);
				if(unit.element.childNodes.length === 0){
					applyClasses({
						remove: ['sgw-processing'],
						add: ['sgw-blocked']
					}, unit.element);
				}
			}, 4000)
			auctionedUnits[unit.elementId] = unit;
		}
		console.log("Ads: Unused ad divs", unusedAdUnits);
		for (let index = 0; index < unusedAdUnits.length; index++) {
			const {element} = unusedAdUnits[index];
			applyClasses({
				add: ['sgw-unused']
			}, element);
		}
	}
	/**
	 * Registers units for lazy loading
	 *
	 * @param {object[]} units Array of lazy loaded units
	 * @memberof autoWrapper
	 * @private
	 */
	function lazyLoad(units){
		for (let index = 0; index < units.length; index++) {
			const unit = units[index];
			lazyLoadObserver.observe(unit.element);
			lazyUnits[unit.elementId] = unit;
		}
	}
	/**
	 * Lazy load intersection callback
	 *
	 * @param {object[]} entries Array of entries
	 * @memberof autoWrapper
	 * @private
	 */
	function lazyLoadAd(entries){
		for (let index = 0; index < entries.length; index++) {
			const entry = entries[index];
			if(entry.intersectionRatio > 0){
				const adUnit = lazyUnits[entry.target.id];
				console.log("Ads: Refreshing ad unit", adUnit);
				if(adUnit.pageTargeting){
					gamWrapper.setPageTargeting(adUnit.pageTargeting);
				}
				gamWrapper.refresh([adUnit.designation]);
				lazyLoadObserver.unobserve(entry.target);
			}
		}
	}

	return {
		init,
		refresh
	}
})();

window.sgwAuto = window.sgwAuto || autoWrapper;

export default autoWrapper;