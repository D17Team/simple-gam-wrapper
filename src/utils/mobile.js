function isFaceBookApp() {
  return /FBAV/i.test(navigator.userAgent);
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function isBlackBerry() {
  return /BlackBerry/i.test(navigator.userAgent);
}

function isiPhone() {
  return /iPhone/i.test(navigator.userAgent);
}

function isiPad() {
  return /iPad/i.test(navigator.userAgent);
}

function isiPod() {
  return /iPod/i.test(navigator.userAgent);
}

function isiOS() {
  return isiPhone() || isiPad() || isiPod();
}

function isiOS11() {
  return /OS 11_0_1|OS 11_0_2|OS 11_0_3|OS 11_1|OS 11_1_1|OS 11_1_2|OS 11_2|OS 11_2_1/i.test(navigator.userAgent);
}

function isOpera() {
  return /Opera Mini/i.test(navigator.userAgent);
}

function isWindows() {
  return /IEMobile/i.test(navigator.userAgent);
}

export function getWindowWidth(){
  const w = window,
  d = document,
  e = d.documentElement,
  g = d.getElementsByTagName('body')[0],
  x = w.innerWidth || e.clientWidth || g.clientWidth;
  return x;
}

function isMobileViewportWidth(){
  return getWindowWidth() < 961;
}

export default function isMobile() {
  return isAndroid() || isFaceBookApp() || isBlackBerry() || isiPhone() || isiPod() || isOpera() || isWindows() || isMobileViewportWidth();
}