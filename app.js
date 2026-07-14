const DEFAULT_CONTENT = window.JJ_DEFAULT_CONTENT || {
  contentVersion: "featured-upfits-2026-07-09",
  heading: "FEATURED UPFITS", subheading: "INTERACTIVE BUILD GALLERY",
  attractHeading: "PURPOSE BUILT FOR THE MISSION", attractEyebrow: "JOHN JONES FEATURED UPFITS",
  idleSeconds: 45, slideshowSeconds: 5,
  upfits: []
};

let content = DEFAULT_CONTENT, activeUpfit = 0, activePhoto = 0, swipeX = 0;
let idleTimer = null, idleDeadline = 0, slideshowTimer = null, slideshowIndex = 0;
let contentSignature = "";
const grid = document.querySelector("#upfitGrid"), viewer = document.querySelector("#viewer"), attract = document.querySelector("#attractScreen");
const contactScreen = document.querySelector("#contactScreen");

function contentVersionMatches(value){
  return !DEFAULT_CONTENT.contentVersion || value?.contentVersion === DEFAULT_CONTENT.contentVersion;
}

function isVideo(value){
  return /^data:video\//i.test(value||"")||/\.(mp4|webm|mov|m4v|ogv)(?:[?#].*)?$/i.test(value||"");
}
function cardMedia(source,title){
  return isVideo(source)
    ? `<span class="card-media"><video src="${source}" aria-label="${title}" muted autoplay loop playsinline preload="metadata"></video></span>`
    : `<span class="card-media"><img src="${source}" alt=""></span>`;
}

async function loadContent() {
  let loaded = false;
  if (location.protocol === "file:") {
    try {
      const saved = localStorage.getItem("jj-display-content");
      if (saved) {
        const savedContent = JSON.parse(saved);
        if (contentVersionMatches(savedContent)) {
          content = savedContent;
          loaded = true;
        } else {
          localStorage.removeItem("jj-display-content");
        }
      }
    } catch {}
  }
  if (!loaded && !location.hostname.endsWith(".github.io")) {
    try {
      const response = await fetch("api/content", {cache:"no-store"});
      if (!response.ok) throw new Error();
      content = await response.json();
      loaded = true;
    } catch {}
  }
  if (!loaded) {
    try {
      const response = await fetch(`content.json?updated=${Date.now()}`, {cache:"no-store"});
      if (response.ok) {
        content = await response.json();
        loaded = true;
      }
    } catch {}
  }
  normalizeUpfits();
  contentSignature = JSON.stringify(content);
  renderDisplay();
  if (location.protocol !== "file:") setInterval(checkForContentUpdates, 30000);
}
async function checkForContentUpdates() {
  try {
    const response = await fetch(`content.json?updated=${Date.now()}`, {cache:"no-store"});
    if (!response.ok) return;
    const next = await response.json(), signature = JSON.stringify(next);
    if (signature === contentSignature) return;
    content = next;
    normalizeUpfits();
    contentSignature = JSON.stringify(content);
    viewer.classList.remove("open");
    viewer.setAttribute("aria-hidden","true");
    renderDisplay();
  } catch {}
}
function normalizeUpfits(){
  content.upfits = Array.isArray(content.upfits) ? content.upfits : [];
  content.upfits.forEach(upfit=>{
    upfit.images = Array.isArray(upfit.images) ? upfit.images : [];
    upfit.modelYear ||= "Model Year Varies";
    upfit.builtFor ||= "Featured Agency Build";
    upfit.agencyType ||= "Law Enforcement";
    upfit.description ||= "Agency-specific, mission-ready configuration focused on officer safety, operational efficiency, OEM compliance, and long-term serviceability.";
  });
}
function renderDisplay() {
  document.querySelector(".topbar span").textContent = content.subheading;
  document.querySelector(".topbar h1").textContent = content.heading;
  document.querySelector("#attractTitle").textContent = content.attractHeading;
  grid.innerHTML = "";
  content.upfits.forEach((upfit, index) => {
    const button = document.createElement("button");
    const titleLength=upfit.title.length;
    button.className = `upfit-card${titleLength>25?" very-long-title":titleLength>17?" long-title":""}`;
    button.style.setProperty("--motion-delay",`${index * -0.8}s`);
    button.innerHTML = `${cardMedia(upfit.images[0]||"assets/tahoe.jpg",upfit.title)}<div><strong>${upfit.title}</strong></div>`;
    button.addEventListener("click", () => openViewer(index));
    grid.appendChild(button);
  });
  resetIdle();
}
function openViewer(index) {
  stopAttract(); activeUpfit = index; activePhoto = 0; renderViewer();
  viewer.classList.add("open"); viewer.setAttribute("aria-hidden","false");
}
function closeViewer() { document.querySelector("#viewerVideo").pause();viewer.classList.remove("open"); viewer.setAttribute("aria-hidden","true"); resetIdle(); }
function updateViewerLayout(){
  if(!viewer.classList.contains("open"))return;
  const title=document.querySelector(".viewer-title").getBoundingClientRect();
  const profile=document.querySelector(".viewer-profile").getBoundingClientRect();
  viewer.style.setProperty("--viewer-media-top",`${Math.ceil(title.bottom)+8}px`);
  viewer.style.setProperty("--viewer-profile-height",`${Math.ceil(profile.height)}px`);
}
function renderViewer() {
  const upfit = content.upfits[activeUpfit];
  const source=upfit.images[activePhoto], image=document.querySelector("#viewerImage"), video=document.querySelector("#viewerVideo");
  document.querySelector("#viewerTitle").textContent = upfit.title;
  if(isVideo(source)){
    image.hidden=true;image.removeAttribute("src");
    video.hidden=false;video.src=source;video.currentTime=0;video.play().catch(()=>{});
  }else{
    video.pause();video.hidden=true;video.removeAttribute("src");
    image.hidden=false;image.src=source;
  }
  document.querySelector("#viewerCounter").textContent = `${String(activePhoto + 1).padStart(2,"0")} / ${String(upfit.images.length).padStart(2,"0")}`;
  document.querySelector("#viewerDots").innerHTML = upfit.images.map((_,i)=>`<i class="${i===activePhoto?"active":""}"></i>`).join("");
  document.querySelector("#viewerYear").textContent = upfit.modelYear;
  document.querySelector("#viewerBuiltFor").textContent = upfit.builtFor;
  document.querySelector("#viewerAgencyType").textContent = upfit.agencyType;
  document.querySelector("#viewerDescription").textContent = upfit.description;
  requestAnimationFrame(updateViewerLayout);
}
function nextPhoto(direction=1) {
  const images=content.upfits[activeUpfit].images; activePhoto=(activePhoto+direction+images.length)%images.length; renderViewer();
}
function allSlides() { return content.upfits.flatMap(upfit=>upfit.images.map(image=>({image,title:upfit.title}))); }
function startAttract() {
  if (contactScreen.classList.contains("open")) return;
  viewer.classList.remove("open");
  viewer.setAttribute("aria-hidden","true");
  activeUpfit=0;
  activePhoto=0;
  clearInterval(slideshowTimer); const slides=allSlides(); if(!slides.length)return;
  renderAttract(slides); attract.classList.add("visible"); attract.setAttribute("aria-hidden","false");
  slideshowTimer=setInterval(()=>{slideshowIndex=(slideshowIndex+1)%slides.length;renderAttract(slides)},(Number(content.slideshowSeconds)||5)*1000);
}
function renderAttract(slides){
  const slide=slides[slideshowIndex%slides.length], image=document.querySelector("#attractImage"), video=document.querySelector("#attractVideo");
  if(isVideo(slide.image)){
    image.hidden=true;image.removeAttribute("src");
    video.hidden=false;video.src=slide.image;video.currentTime=0;video.play().catch(()=>{});
    video.style.animation="none";requestAnimationFrame(()=>video.style.animation="");
  }else{
    video.pause();video.hidden=true;video.removeAttribute("src");
    image.hidden=false;image.src=slide.image;
    image.style.animation="none";requestAnimationFrame(()=>image.style.animation="");
  }
  document.querySelector("#attractEyebrow").textContent=slide.title.toUpperCase();
}
function stopAttract(){clearInterval(slideshowTimer);document.querySelector("#attractVideo").pause();attract.classList.remove("visible");attract.setAttribute("aria-hidden","true");resetIdle()}
function checkIdle(){
  clearTimeout(idleTimer);
  const remaining=idleDeadline-Date.now();
  if(remaining<=0){startAttract();return}
  idleTimer=setTimeout(checkIdle,Math.min(remaining,1000));
}
function resetIdle(){
  idleDeadline=Date.now()+(Number(content.idleSeconds)||45)*1000;
  checkIdle();
}
document.querySelector("#closeViewer").addEventListener("click",closeViewer);
document.querySelector("#photoStage").addEventListener("click",()=>{if(!document.querySelector("#viewerImage").hidden)nextPhoto()});
document.querySelector("#photoStage").addEventListener("pointerdown",e=>swipeX=e.clientX);
document.querySelector("#photoStage").addEventListener("pointerup",e=>{const dx=e.clientX-swipeX;if(Math.abs(dx)>70)nextPhoto(dx<0?1:-1);swipeX=0});
document.querySelector("#viewerVideo").addEventListener("ended",()=>nextPhoto());
window.addEventListener("resize",updateViewerLayout);
document.querySelector("#exploreButton").addEventListener("click",stopAttract);
document.querySelector("#attractScreen").addEventListener("pointerdown",stopAttract);
document.addEventListener("pointerdown",e=>{if(!e.target.closest("#attractScreen"))resetIdle()});
document.addEventListener("keydown",resetIdle);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)checkIdle()});
setInterval(()=>{if(idleDeadline>0&&!attract.classList.contains("visible")&&Date.now()>=idleDeadline)startAttract()},1000);

function openContact(){
  stopAttract();
  clearTimeout(idleTimer);
  idleDeadline=0;
  const frame=document.querySelector("#websiteContactFrame");
  if(frame&&!frame.src)frame.src=frame.dataset.src;
  contactScreen.classList.add("open");
  contactScreen.setAttribute("aria-hidden","false");
}
function closeContact(){
  contactScreen.classList.remove("open");
  contactScreen.setAttribute("aria-hidden","true");
  resetIdle();
}
document.querySelector("#contactButton").addEventListener("click",openContact);
document.querySelector("#closeContact").addEventListener("click",closeContact);
loadContent();
