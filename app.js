const DEFAULT_CONTENT = window.JJ_DEFAULT_CONTENT || {
  heading: "FEATURED UPFITS", subheading: "INTERACTIVE BUILD GALLERY",
  attractHeading: "PURPOSE BUILT FOR THE MISSION", attractEyebrow: "JOHN JONES FEATURED UPFITS",
  idleSeconds: 45, slideshowSeconds: 5, lightDurationSeconds: 15, shellyPlugs: [],
  upfits: [
    {title:"Dodge Chargers",images:["assets/categories/charger-1.jpg","assets/categories/charger-2.jpg","assets/categories/charger-3.jpg"]},
    {title:"RAM Trucks",images:["assets/categories/ram-1.jpg","assets/categories/ram-2.jpg","assets/categories/ram-3.jpg"]},
    {title:"Chevrolet Tahoes",images:["assets/tahoe.jpg"]},
    {title:"Dodge Durangos",images:["assets/categories/durango-1.jpg","assets/categories/durango-2.jpg","assets/categories/durango-3.jpg"]},
    {title:"RAM ProMasters",images:["assets/categories/promaster-1.png","assets/categories/promaster-2.png","assets/categories/promaster-3.png"]},
    {title:"Dodge Grand Caravans",images:["assets/categories/caravan-1.jpg","assets/categories/caravan-2.jpg","assets/categories/caravan-3.jpg"]},
    {title:"Jeep Grand Cherokee",images:["assets/categories/grand-cherokee-1.jpg","assets/categories/grand-cherokee-2.jpg","assets/categories/grand-cherokee-3.jpg"]},
    {title:"UTV",images:["assets/categories/utv-1.jpg","assets/categories/utv-2.jpg"]},
    {title:"Chevrolet Silverados",images:["assets/builds/rowan-1.jpg","assets/builds/rowan-7.jpg","assets/builds/rowan-8.jpg"]},
    {title:"Chevrolet Suburban",images:["assets/categories/suburban-1.jpg","assets/categories/suburban-2.png","assets/categories/suburban-3.jpg"]},
    {title:"Jeep Gladiator",images:["assets/categories/gladiator-1.png","assets/categories/gladiator-2.png","assets/categories/gladiator-3.png"]}
  ]
};

let content = DEFAULT_CONTENT, activeUpfit = 0, activePhoto = 0, swipeX = 0;
let idleTimer = null, slideshowTimer = null, slideshowIndex = 0, countdownTimer = null, secondsLeft = 0;
const grid = document.querySelector("#upfitGrid"), viewer = document.querySelector("#viewer"), attract = document.querySelector("#attractScreen");
const settings = window.JJ_LIGHTS || {}, lightsButton = document.querySelector("#lightsButton");

async function loadContent() {
  try {
    const saved = localStorage.getItem("jj-display-content");
    if (saved) {
      content = JSON.parse(saved);
      normalizeUpfits();
      renderDisplay();
      return;
    }
  } catch {}
  try {
    const response = await fetch("api/content", {cache:"no-store"});
    if (!response.ok) throw new Error();
    content = await response.json();
  } catch {
    try {
      const response = await fetch("content.json", {cache:"no-store"});
      if (response.ok) content = await response.json();
    } catch {}
  }
  normalizeUpfits();
  renderDisplay();
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
    button.className = "upfit-card";
    button.style.setProperty("--motion-delay",`${index * -0.8}s`);
    button.innerHTML = `<img src="${upfit.images[0]}" alt=""><div><span>FEATURED UPFIT ${String(index + 1).padStart(2,"0")}</span><strong>${upfit.title}</strong></div>`;
    button.addEventListener("click", () => openViewer(index));
    grid.appendChild(button);
  });
  updateLights();
  resetIdle();
}
function openViewer(index) {
  stopAttract(); activeUpfit = index; activePhoto = 0; renderViewer();
  viewer.classList.add("open"); viewer.setAttribute("aria-hidden","false");
}
function closeViewer() { viewer.classList.remove("open"); viewer.setAttribute("aria-hidden","true"); resetIdle(); }
function renderViewer() {
  const upfit = content.upfits[activeUpfit];
  document.querySelector("#viewerTitle").textContent = upfit.title;
  document.querySelector("#viewerImage").src = upfit.images[activePhoto];
  document.querySelector("#viewerCounter").textContent = `${String(activePhoto + 1).padStart(2,"0")} / ${String(upfit.images.length).padStart(2,"0")}`;
  document.querySelector("#viewerDots").innerHTML = upfit.images.map((_,i)=>`<i class="${i===activePhoto?"active":""}"></i>`).join("");
  document.querySelector("#viewerYear").textContent = upfit.modelYear;
  document.querySelector("#viewerBuiltFor").textContent = upfit.builtFor;
  document.querySelector("#viewerAgencyType").textContent = upfit.agencyType;
  document.querySelector("#viewerDescription").textContent = upfit.description;
}
function nextPhoto(direction=1) {
  const images=content.upfits[activeUpfit].images; activePhoto=(activePhoto+direction+images.length)%images.length; renderViewer();
}
function allSlides() { return content.upfits.flatMap(upfit=>upfit.images.map(image=>({image,title:upfit.title}))); }
function startAttract() {
  if (secondsLeft>0) return;
  viewer.classList.remove("open");
  viewer.setAttribute("aria-hidden","true");
  activeUpfit=0;
  activePhoto=0;
  clearInterval(slideshowTimer); const slides=allSlides(); if(!slides.length)return;
  renderAttract(slides); attract.classList.add("visible"); attract.setAttribute("aria-hidden","false");
  slideshowTimer=setInterval(()=>{slideshowIndex=(slideshowIndex+1)%slides.length;renderAttract(slides)},(Number(content.slideshowSeconds)||5)*1000);
}
function renderAttract(slides){
  const slide=slides[slideshowIndex%slides.length], image=document.querySelector("#attractImage");
  image.src=slide.image;
  image.style.animation="none";
  requestAnimationFrame(()=>image.style.animation="");
  document.querySelector("#attractEyebrow").textContent=slide.title.toUpperCase();
}
function stopAttract(){clearInterval(slideshowTimer);attract.classList.remove("visible");attract.setAttribute("aria-hidden","true");resetIdle()}
function resetIdle(){clearTimeout(idleTimer);idleTimer=setTimeout(startAttract,(Number(content.idleSeconds)||45)*1000)}
function lightDuration(){return Number(content.lightDurationSeconds)||Number(settings.durationSeconds)||15}
function cleanShellyAddress(value){return String(value||"").trim().replace(/^https?:\/\//,"").replace(/\/+$/,"")}
function shellyAddresses(){
  const configured=Array.isArray(content.shellyPlugs)?content.shellyPlugs.map(plug=>cleanShellyAddress(typeof plug==="string"?plug:plug.ip)).filter(Boolean):[];
  if(configured.length)return [...new Set(configured)];
  const fallback=Array.isArray(settings.shellyPlugs)?settings.shellyPlugs.map(plug=>cleanShellyAddress(typeof plug==="string"?plug:plug.ip)).filter(Boolean):[];
  const legacy=cleanShellyAddress(content.shellyIp||settings.shellyIp);
  return [...new Set([...fallback,...(legacy?[legacy]:[])])];
}
async function sendShelly(on){
  const addresses=shellyAddresses();if(!addresses.length)return false;
  const extra=on?`&toggle_after=${lightDuration()}`:"";
  const results=await Promise.allSettled(addresses.map(ip=>fetch(`http://${ip}/rpc/Switch.Set?id=0&on=${on}${extra}`,{mode:"no-cors",cache:"no-store"})));
  return results.some(result=>result.status==="fulfilled");
}
function updateLights(){
  const on=secondsLeft>0;document.body.classList.toggle("lights-on",on);
  document.querySelector("#lightsLabel").textContent=on?`LIGHTS ON - ${String(secondsLeft).padStart(2,"0")}s`:"ACTIVATE LIGHTS";
  document.querySelector("#lightsStatus").textContent=on?"Tap to turn off now":`LIGHT BAR DEMO - automatic ${lightDuration()} second shutoff`;
  document.querySelector(".button-arrow").textContent=on?"X":">";
}
async function turnLightsOff(){clearInterval(countdownTimer);secondsLeft=0;updateLights();await sendShelly(false);resetIdle()}
async function turnLightsOn(){stopAttract();secondsLeft=lightDuration();updateLights();await sendShelly(true);clearInterval(countdownTimer);countdownTimer=setInterval(()=>{secondsLeft-=1;updateLights();if(secondsLeft<=0)turnLightsOff()},1000)}
document.querySelector("#closeViewer").addEventListener("click",closeViewer);
document.querySelector("#photoStage").addEventListener("click",()=>nextPhoto());
document.querySelector("#photoStage").addEventListener("pointerdown",e=>swipeX=e.clientX);
document.querySelector("#photoStage").addEventListener("pointerup",e=>{const dx=e.clientX-swipeX;if(Math.abs(dx)>70)nextPhoto(dx<0?1:-1);swipeX=0});
document.querySelector("#exploreButton").addEventListener("click",stopAttract);
document.querySelector("#attractScreen").addEventListener("pointerdown",stopAttract);
lightsButton.addEventListener("click",()=>secondsLeft>0?turnLightsOff():turnLightsOn());
document.addEventListener("pointerdown",e=>{if(!e.target.closest("#attractScreen"))resetIdle()});
loadContent();
