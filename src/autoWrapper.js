import isMobile from "./utils/mobile";
import { formatReferrer } from "./utils/url";
import gamWrapper from "./gamWrapper";
import { getCurrentPageUnits } from "./getUnits";
import { kebabCase } from "./utils/str";
import "./autoWrapper.css";
/**
 * Ads implementation
 *
 * @returns {object} Ads API object
 * @namespace autoWrapper
 */
const autoWrapper = (function(){
	/**
	 * Configuration for ads on site
	 *
	 * @type {object}
	 * @memberof autoWrapper
	 * @private
	 */
	let config = {
		reserveSpace: false,
		standardReferrer: true,
		applyClasses: false,
		lazyLoadOptions: { rootMargin: '500px 0px', threshold: 0.01 }
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
	 * Sets unit configs on gamWrapper
	 *
	 * @memberof autoWrapper
	 * @private
	 */
	function setUnits(){
		gamWrapper.setUnitConfigs(config.adUnits);
	}
	/**
	 * Sets the page GAM Path
	 *
	 * @memberof autoWrapper
	 * @private
	 */
	function setGamPath(){
		if(config.gamPath){
			gamWrapper.setConfig({ gamPath: config.gamPath });
		} else if(config.mobileGamPath && config.desktopGamPath){
			gamWrapper.setConfig({
				gamPath: isMobile() ? config.mobileGamPath : config.desktopGamPath
			})
		}
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
	 * Method for attempting to fetch wordpress author data
	 *
	 * @memberof autoWrapper
	 * @private
	 */
	async function tryWpAuthorFetch(){
		const wpApiLinkEl = window.document.querySelector("link[rel='alternate'][href*='wp-json']");
		if(wpApiLinkEl){
			const wpApiLink = wpApiLinkEl.href;
			try {
				console.log("Ads: Author data not given. Trying to fetch author data from wordpress.");
				const wpApiResponse = await fetch(wpApiLink);
				const wpApiData = await wpApiResponse.json();
				if(wpApiData && wpApiData.id){
					config.pageTargeting.contentId = '' + wpApiData.id;
				}
				config.pageTargeting.authorId = '' + wpApiData.author;
				if(wpApiData.author_info){
					config.pageTargeting.authorName = kebabCase(wpApiData.author_info.display_name);
				} else if(wpApiData.yoast_head_json && wpApiData.yoast_head_json.schema){
					const graphAuthor = wpApiData.yoast_head_json.schema['@graph'].find(v => v['@type'] === 'Person');
					if(graphAuthor){
						config.pageTargeting.authorName = kebabCase(graphAuthor.name);
					}
				}
				console.log("Ads: Author data fetched from wordpress.", config.pageTargeting, wpApiData);
				gamWrapper.setPageTargeting(config.pageTargeting);
				window.SGW_AUTO.config = config;
			} catch (err) {
				console.error("Ads: Failed to retrieve WP-API details", err);
			}
		}
	}
	/**
	 * Initializes all ads processes
	 *
	 * @memberof autoWrapper
	 */
	async function init(passedConfig = {}){
		window.SGW_AUTO = {config:{}};
		config = {
			...config,
			...passedConfig
		};
		console.log("Ads: initializing", config);
		lazyLoadObserver = new IntersectionObserver(
			lazyLoadAd,
			config.lazyLoadOptions
		)
		setupEventListeners();
		config.pageType = config.pageType || config.pageTargeting.ptype || 'article';
		
		if(config.pageType === 'article' && (!config.pageTargeting || config.pageTargeting.authorId === '' || !config.pageTargeting.contentId === '')){
			await tryWpAuthorFetch();
		}
		if(config.pageTargeting){
			gamWrapper.setPageTargeting(config.pageTargeting);
		}
		if(config.standardReferrer){
			gamWrapper.setPageTargeting({referrer: formatReferrer(document.referrer)})
		}
		setUnits();
		setGamPath();
		applyClasses({
			add: ['sgw-ptype-' + config.pageType]
		}, window.document.body)
		window.SGW_AUTO.config = {
			...config,
			pageTargeting: {
				...(window.SGW_AUTO.config.pageTargeting || {}),
				...(config.pageTargeting || {}),
			}
		};
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
		const {refreshUnits, lazyLoadUnits, allUnits, unusedAdUnits } = getCurrentPageUnits(config.adUnits, {pageType: config.pageType});
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