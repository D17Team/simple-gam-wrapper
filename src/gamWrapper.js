/**
 * Simple GAM Wrapper - A minimal/basic ad wrapper for Google Ad Manager / googletag
 * 
 * @namespace gamWrapper
 */
const gamWrapper = (function () {
	/**
	 * The configuration object for the wrapper
	 *
	 * @type {Object}
	 * @private
	 * @memberof gamWrapper
	 */
	let config = {};
	/**
	 * Object for tracking all unit configurations and their defined slots.
	 *
	 * @type {Object}
	 * @private
	 * @memberof gamWrapper
	 */
	let unitRegistry = {};
	/**
	 * Flag for tracking whether services have been enabled or not.
	 *
	 * @type {Boolean}
	 * @private
	 * @memberof gamWrapper
	 */
	let googletagServicesEnabled = false;
	/**
	 * Method setter for unit configurations
	 *
	 * @param {Object} newUnitConfigs
	 * @memberof gamWrapper
	 */
	function setUnitConfigs(newUnitConfigs) {
		unitRegistry = newUnitConfigs;
	}
	/**
	* Simple object check.
	* @param item
	* @returns {boolean}
	* @private
	* @memberof gamWrapper
	*/
	function isObject(item) {
		return (item && typeof item === 'object' && !Array.isArray(item));
	}
	/**
	* Deep merge two objects.
	*
	* @param target
	* @param sources
	* @private
	* @returns {Object}
	* @memberof gamWrapper
	*/
	function mergeDeep(target, sources) {
		if (!sources.length) return target;
		const source = sources.shift();

		if (isObject(target) && isObject(source)) {

			for (const key in source) {
				if (Object.hasOwnProperty.call(source, key)) {
					if (isObject(source[key])) {
						if (!target[key]) {
							var tmpMrgDp = {};
							tmpMrgDp[key] = {};
							Object.assign(target, tmpMrgDp)
						};
						mergeDeep(target[key], source[key]);
					} else {
						var tmpMrgDp = {};
						tmpMrgDp[key] = source[key];
						Object.assign(target, tmpMrgDp);
					}
				}
			}
		}

		return mergeDeep(target, sources);
	}
	/**
	 * Method to get unit registry configurations
	 *
	 * @param {string|Object} unitId Object or id of the unit to get
	 * @return {Object} 
	 * @memberof gamWrapper
	 */
	function getUnit(unitId) {
		const unitConfig = isObject(unitId) ? mergeDeep(unitRegistry[unitId.inherit], [unitId]) : unitRegistry[unitId]; // You can use lodash merge here or define your own merge function
		const id = unitConfig.elementId || unitId;
		if (!unitRegistry[unitConfig.elementId]) {
			unitRegistry[unitConfig.elementId] = unitConfig;
		}
		if (!unitConfig.element) {
			unitConfig.element = window.document.getElementById(unitConfig.elementId);
		}
		if (!unitConfig.setTargeting) {
			unitConfig.setTargeting = function (key, value) {
				if (isObject(key)) {
					unitRegistry[id].targeting = mergeDeep(unitRegistry[id].targeting, [key]);
					wrapMethod('updateTargetingFromMap', id)(key);
				} else {
					unitRegistry[id].targeting[key] = value;
					wrapMethod('setTargeting', id)(arguments);
				}
			}
			unitConfig.clearTargeting = function (key) {
				if (!key) {
					unitRegistry[id].targeting = {};
					wrapMethod('clearTargeting', id)();
				} else {
					delete unitRegistry[id].targeting[key];
					wrapMethod('clearTargeting', id)(key);
				}
			}
		}
		return unitConfig;
	}
	/**
	 * Method to define the on page ad slots
	 *
	 * @param {Array<string|Object>} unitIds Array of unit ids or partial unit configurations to define
	 * @return {Object[]} Google Tag Slots
	 * @private
	 * @memberof gamWrapper
	 */
	function defineSlots(unitIds) {
		const resultSlots = [];
		for (let index = 0; index < unitIds.length; index++) {
			const unitId = isObject(unitIds[index]) ? unitIds[index].elementId : unitIds[index];
			if (unitRegistry[unitId] && unitRegistry[unitId].slot) {
				resultSlots.push(unitRegistry[unitId]);
			} else {
				const slotConfiguration = getUnit(unitIds[index]);
				if (slotConfiguration.element) {
					if (slotConfiguration.outOfPage) {
						unitRegistry[slotConfiguration.elementId].slot = googletag.defineOutOfPageSlot(config.gamPath, slotConfiguration.elementId);
					} else {
						unitRegistry[slotConfiguration.elementId].slot = window.googletag.defineSlot(config.gamPath, slotConfiguration.sizes, slotConfiguration.elementId);
					}
					if (slotConfiguration.collapseEmptyDiv) {
						unitRegistry[slotConfiguration.elementId].slot.setCollapseEmptyDiv.apply(unitRegistry[slotConfiguration.elementId].slot, slotConfiguration.collapseEmptyDiv);
					}
					unitRegistry[slotConfiguration.elementId].slot.addService(window.googletag.pubads());
					if (slotConfiguration.targeting) {
						for (const key in slotConfiguration.targeting) {
							unitRegistry[slotConfiguration.elementId].slot.setTargeting(key, slotConfiguration.targeting[key]);
						}
					}
					unitRegistry[slotConfiguration.elementId].slot = unitRegistry[slotConfiguration.elementId].slot;
					resultSlots.push(unitRegistry[slotConfiguration.elementId].slot);
				} else {
					console.error('gamWrapper: The element with id "' + slotConfiguration.elementId + '" does not exist. Cannot define slot.');
				}
			}
		}

		if (!googletagServicesEnabled) {
			window.googletag.pubads().enableSingleRequest();
			window.googletag.enableServices();
			googletagServicesEnabled = true;
		}
		return resultSlots;
	}
	/**
	 * Displays slots on the page
	 *
	 * @param {Array<string|Object>} unitIds Array of unit ids or partial unit configurations to display
	 * @memberof gamWrapper
	 */
	function displaySlots(unitIds) {
		for (let index = 0; index < unitIds.length; index++) {
			const unitId = unitIds[index];
			const slotConfiguration = getUnit(unitId);
			if (slotConfiguration.element) {
				window.googletag.cmd.push(function () {
					window.googletag.display(slotConfiguration.elementId);
				});
			} else {
				console.error('gamWrapper: The element with id "' + slotConfiguration.elementId + '" does not exist. Cannot display slot.');
			}
		}
	}
	/**
	 * Refreshes on page slots
	 *
	 * @param {Object[]} slots Array of google tag slots to refresh
	 * @private
	 * @memberof gamWrapper
	 */
	function refreshSlots(slots) {
		if(slots.length > 0) {
			window.googletag.pubads().refresh(slots);
		}
	}
	/**
	 * Method for setting page targeting
	 *
	 * @param {Object} targeting Object of targeting to set
	* @memberof gamWrapper
	 */
	function setPageTargeting(targeting) {
		window.googletag.cmd.push(function () {
			for (const key in targeting) {
				window.googletag.pubads().setTargeting(key, "" + targeting[key]);
			}
		});
	}
	/**
	 * Implementation method to handle refreshing ads on page
	 *
	 * @param {Array<string|Object>} unitIds Array of unit ids or partial unit configurations to refresh
	 * @memberof gamWrapper
	 */
	function refresh(unitIds) {
		googletag.cmd.push(function () {
			const refreshSlotsArr = defineSlots(unitIds);
			displaySlots(unitIds);
			refreshSlots(refreshSlotsArr);
		});

		return unitIds.map(getUnit);
	}
	/**
	 * Method to add safety wrapper to googletag methods
	 *
	 * @param {string} methodName Name of the method to wrap.
	 * @param {string|void} unitId Id of the unit slot to wrap.
	 * @param {boolean|void} onPubads Whether the method is off of pubads or not.
	 * @return {Function} Safely wrapped method.
	 * @private
	 * @memberof gamWrapper
	 */
	function wrapMethod(methodName, unitId, onPubads) {
		return function () {
			googletag.cmd.push(function () {
				const base = unitId ? getUnit(unitId).slot : window.googletag;
				if (onPubads) {
					base = base.pubads();
				}
				base[methodName].apply(base, arguments);
			})
		}
	}
	/**
	 * Safely wrapped and normalized clear slots method
	 *
	 * @param {Array<string|Object>} unitIds Unit ids to clear
	 * @memberof gamWrapper
	 */
	function clearSlots(unitIds) {
		window.googletag.cmd.push(function () {
			var resultSlots = [];
			for (var index = 0; index < unitIds.length; index++) {
				var unitId = unitIds[index];
				var unitConfig = getUnit(unitId);
				if (unitConfig.slot) {
					resultSlots.push(unitConfig.slot);
				}
			}
			window.googletag.pubads().clear(resultSlots);
		})
	}
	/**
	 * Safely wrapped and normalized destroy slots method
	 *
	 * NOTE: Only use this method if the ad element is deleted from the page and re-added. Otherwise, use clearSlots.
	 *
	 * @param {Array<string|Object>} unitIds
	 * @memberof gamWrapper
	 */
	function destroySlots(unitIds) {
		window.googletag.cmd.push(function () {
			const resultSlots = [];
			for (let index = 0; index < unitIds.length; index++) {
				const unitId = unitIds[index];
				const unitConfig = getUnit(unitId);
				if (unitConfig.slot) {
					resultSlots.push(unitConfig.slot);
				}
			}
			window.googletag.destroySlots(resultSlots);
		})

	}
	/**
	 * Method getter for getting sets or all units
	 *
	 * @param {Array<string|Object>|void} unitIds Unit ids to get, or undefined to get all units
	 * @return {Array<Object>} Array of unit configurations
	 * @memberof gamWrapper
	 */
	function getUnits(unitIds) {
		return unitIds ? unitIds.map(getUnit) : Object.keys(unitRegistry).map(getUnit);
	}
	/**
	 * Method for setting the GAM Path for the page.
	 *
	 * @param {string} path GAM Path to set
	 * @memberof gamWrapper
	 */
	function setConfig(newConfig) {
		config = newConfig;
	}
	/**
	 * Method for getting the GAM Path for the page.
	 *
	 * @return {string} The GAM Path for the page.
	 * @memberof gamWrapper
	 */
	function getConfig() {
		return config;
	}
	/**
	 * Boostrapping code for the page.
	 *
	 * @memberof gamWrapper
	 * @private
	 */
	function bootstrap() {
		window.googletag = window.googletag || { cmd: [] };
		window.googletag.cmd.push(function () {
			if (!googletag.pubads().isInitialLoadDisabled()) {
				googletag.pubads().disableInitialLoad();
			}
		})
	}

	bootstrap();

	return {
		refresh: refresh,
		setUnitConfigs: setUnitConfigs,
		setPageTargeting: setPageTargeting,
		getUnit: getUnit,
		getUnits: getUnits,
		clearTargeting: wrapMethod("clearTargeting", undefined, true),
		collapseEmptyDivs: wrapMethod("collapseEmptyDivs", undefined, true),
		enableLazyLoad: wrapMethod("enableLazyLoad", undefined, true),
		destroySlots: destroySlots,
		clearSlots: clearSlots,
		setConfig: setConfig,
		getConfig: getConfig
	}
})();

window.sgw = window.sgw || gamWrapper;

export default gamWrapper;