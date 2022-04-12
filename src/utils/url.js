export function formatReferrer(referrer) {
  if (referrer === '') {
    return 'direct';
  } else if (referrer.match(/facebook\.com/g)) {
    return 'facebook';
  } else if (referrer.match(/googlequicksearchbox/g)) {
    return 'discover';
  } else if (referrer.match(/googleapis/g)) {
    return 'googlecards';
  } else if (referrer.match(/news\.google\.com/g)) {
    return 'googlenews';
  } else if (referrer.match(/ampproject\.org/g)) {
    return 'amp';
  } else if (referrer.match(/t\.co/g)) {
    return 'twitter';
  } else if (referrer.match(/pinterest\.com/g)) {
    return 'pinterest';
  } else if (referrer.match(/instagram\.com/g)) {
    return 'instagram';
  } else if (referrer.match(/newsbreak/g)) {
    return 'newsbreak';
  } else if (referrer.match(/smartnews\.com/g)) {
    return 'smartnews';
  } else if (
    referrer.match(
      /(google|duckduckgo|bing|yahoo|search|aol\.com|ecosia\.org)/g
    )
  ) {
    return 'search';
  } else {
    return 'other';
  }
}