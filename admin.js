let content = null;
let backendAvailable = false;
const uploads = [];

async function load() {
  const inferredOwner = location.hostname.endsWith(".github.io") ? location.hostname.split(".")[0] : "";
  const inferredRepo = location.hostname.endsWith(".github.io") ? location.pathname.split("/").filter(Boolean)[0] || "" : "";
  document.querySelector("#githubOwner").value = sessionStorage.getItem("jj-github-owner") || inferredOwner;
  document.querySelector("#githubRepo").value = sessionStorage.getItem("jj-github-repo") || inferredRepo || "john-jones-ppv-display";
  try {
    const saved = localStorage.getItem("jj-display-content");
    if (saved) content = JSON.parse(saved);
  } catch {}
  try {
    const response = await fetch("/api/content", {cache:"no-store"});
    if (response.ok) {
      content = await response.json();
      backendAvailable = true;
    }
  } catch {}
  if (!backendAvailable && location.protocol !== "file:") {
    try {
      const response = await fetch(`content.json?updated=${Date.now()}`, {cache:"no-store"});
      if (response.ok) content = await response.json();
    } catch {}
  }
  content ||= structuredClone(window.JJ_DEFAULT_CONTENT);
  normalizeLightShow();
  normalizeShellys();
  normalizeUpfits();
  ["heading","subheading","attractHeading","idleSeconds","slideshowSeconds","lightButtonLabel","lightButtonDescription","lightDurationSeconds"].forEach(key => document.querySelector(`#${key}`).value = content[key] || "");
  document.querySelector("#showLightControl").checked = content.showLightControl;
  render();
  showMode();
}

function normalizeLightShow() {
  content.showLightControl = content.showLightControl !== false;
  content.lightButtonLabel ||= "Activate Lights";
  content.lightButtonDescription ||= "Light Bar Demo";
  content.lightDurationSeconds = Number(content.lightDurationSeconds) || 15;
}

function normalizeShellys() {
  const legacyIp = String(content.shellyIp || "").trim();
  if (!Array.isArray(content.shellyPlugs)) content.shellyPlugs = [];
  content.shellyPlugs = content.shellyPlugs.map((plug,index) => typeof plug === "string"
    ? {name:`Light Bar ${index + 1}`,ip:plug}
    : {name:String(plug.name || `Light Bar ${index + 1}`),ip:String(plug.ip || "")});
  if (!content.shellyPlugs.length && legacyIp) content.shellyPlugs.push({name:"Light Bar 1",ip:legacyIp});
}

function normalizeUpfits() {
  content.upfits = Array.isArray(content.upfits) ? content.upfits : [];
  content.upfits.forEach(upfit=>{
    upfit.images = Array.isArray(upfit.images) ? upfit.images : [];
    upfit.modelYear ||= "Model Year Varies";
    upfit.builtFor ||= "Featured Agency Build";
    upfit.agencyType ||= "Law Enforcement";
    upfit.description ||= "Agency-specific, mission-ready configuration focused on officer safety, operational efficiency, OEM compliance, and long-term serviceability.";
  });
}

function showMode() {
  const message = document.querySelector("#message");
  message.textContent = backendAvailable
    ? "Backend connected. Changes will be saved for every display."
    : "Enter the GitHub publishing token above. Save will publish changes to every display.";
  message.className = "message";
}

function render() {
  renderShellys();
  const editor = document.querySelector("#editor");
  editor.innerHTML = content.upfits.map((upfit,index)=>`<details class="item">
    <summary>
      <i class="drag-handle" data-drag-index="${index}" draggable="true" title="Drag to reorder" aria-label="Drag ${escapeHtml(upfit.title)} to reorder"><b></b><b></b><b></b></i>
      <img src="${upfit.images[0] || "assets/tahoe.jpg"}" alt="">
      <span><strong>${escapeHtml(upfit.title)}</strong><small>Click to edit vehicle, details, and photos</small></span>
      <b>EDIT</b>
    </summary>
    <div class="item-body">
      <button class="remove-section" data-remove-section="${index}">Remove Upfit</button>
      <label>Vehicle / Display Title<input data-title="${index}" value="${escapeHtml(upfit.title)}" placeholder="Example: Chevrolet Silverado"></label>
      <div class="build-fields">
        <label>Model Year<input data-build-field="modelYear:${index}" value="${escapeHtml(upfit.modelYear)}" placeholder="Example: 2025"></label>
        <label>Built For<input data-build-field="builtFor:${index}" value="${escapeHtml(upfit.builtFor)}" placeholder="Example: Clark County Sheriff's Office"></label>
        <label>Agency Type<input data-build-field="agencyType:${index}" value="${escapeHtml(upfit.agencyType)}" placeholder="Example: Sheriff's Office"></label>
      </div>
      <label>Upfit Description<textarea data-build-field="description:${index}" placeholder="Explain the mission, major equipment, and special features.">${escapeHtml(upfit.description)}</textarea></label>
      <div class="photos">${upfit.images.map((image,imageIndex)=>`<div class="photo"><img src="${image}"><button data-remove="${index}:${imageIndex}">X</button></div>`).join("")}</div>
      <label class="upload">Add Photos<input data-upload="${index}" type="file" accept="image/*" multiple></label>
    </div>
  </details>`).join("");
  document.querySelectorAll(".item").forEach(item=>item.addEventListener("toggle",()=>{
    if(!item.open)return;
    document.querySelectorAll(".item[open]").forEach(other=>{if(other!==item)other.open=false});
  }));
  enableUpfitReordering();
  document.querySelectorAll("[data-title]").forEach(input=>input.addEventListener("input",()=>content.upfits[Number(input.dataset.title)].title=input.value));
  document.querySelectorAll("[data-build-field]").forEach(input=>input.addEventListener("input",()=>{
    const [field,index]=input.dataset.buildField.split(":");
    content.upfits[Number(index)][field]=input.value;
  }));
  document.querySelectorAll("[data-remove]").forEach(button=>button.addEventListener("click",()=>{const [i,j]=button.dataset.remove.split(":").map(Number);content.upfits[i].images.splice(j,1);render()}));
  document.querySelectorAll("[data-upload]").forEach(input=>input.addEventListener("change",()=>addFiles(Number(input.dataset.upload),input.files)));
  document.querySelectorAll("[data-remove-section]").forEach(button=>button.addEventListener("click",()=>{
    content.upfits.splice(Number(button.dataset.removeSection),1);
    render();
  }));
}

function enableUpfitReordering(){
  let draggedIndex = null;
  const clearDropState=()=>document.querySelectorAll(".item").forEach(item=>item.classList.remove("drop-before","drop-after"));
  const clearDragState=()=>document.querySelectorAll(".item").forEach(item=>item.classList.remove("dragging","drop-before","drop-after"));
  document.querySelectorAll(".drag-handle").forEach(handle=>{
    handle.addEventListener("click",event=>{event.preventDefault();event.stopPropagation()});
    handle.addEventListener("dragstart",event=>{
      draggedIndex=Number(handle.dataset.dragIndex);
      event.dataTransfer.effectAllowed="move";
      event.dataTransfer.setData("text/plain",String(draggedIndex));
      handle.closest(".item").classList.add("dragging");
    });
    handle.addEventListener("dragend",()=>{draggedIndex=null;clearDragState()});
  });
  document.querySelectorAll(".item").forEach((item,targetIndex)=>{
    item.addEventListener("dragover",event=>{
      if(draggedIndex===null||draggedIndex===targetIndex)return;
      event.preventDefault();
      clearDropState();
      item.classList.add(event.clientY<item.getBoundingClientRect().top+item.offsetHeight/2?"drop-before":"drop-after");
    });
    item.addEventListener("drop",event=>{
      event.preventDefault();
      if(draggedIndex===null||draggedIndex===targetIndex)return clearDragState();
      const insertAfter=item.classList.contains("drop-after");
      const [moved]=content.upfits.splice(draggedIndex,1);
      let insertIndex=targetIndex;
      if(draggedIndex<targetIndex)insertIndex-=1;
      if(insertAfter)insertIndex+=1;
      content.upfits.splice(insertIndex,0,moved);
      draggedIndex=null;
      render();
      const movedRow=document.querySelectorAll(".item")[insertIndex];
      movedRow?.classList.add("just-moved");
      movedRow?.scrollIntoView({behavior:"smooth",block:"center"});
    });
  });
}

function renderShellys() {
  const list = document.querySelector("#shellyList");
  if (!content.shellyPlugs.length) {
    list.innerHTML = `<div class="shelly-empty">No Shelly plugs added yet. Add one to connect the booth light bars.</div>`;
    return;
  }
  list.innerHTML = content.shellyPlugs.map((plug,index)=>`<div class="shelly-row"><label>Plug Name<input data-shelly-name="${index}" value="${escapeHtml(plug.name)}" placeholder="Example: Table Light Bar"></label><label>Local IP Address<input data-shelly-ip="${index}" value="${escapeHtml(plug.ip)}" placeholder="Example: 192.168.1.50"></label><button data-test-shelly="${index}">Test Plug</button><button class="remove-shelly" data-remove-shelly="${index}">Remove</button></div>`).join("");
  document.querySelectorAll("[data-shelly-name]").forEach(input=>input.addEventListener("input",()=>content.shellyPlugs[Number(input.dataset.shellyName)].name=input.value));
  document.querySelectorAll("[data-shelly-ip]").forEach(input=>input.addEventListener("input",()=>content.shellyPlugs[Number(input.dataset.shellyIp)].ip=input.value));
  document.querySelectorAll("[data-test-shelly]").forEach(button=>button.addEventListener("click",()=>testShellys([content.shellyPlugs[Number(button.dataset.testShelly)]])));
  document.querySelectorAll("[data-remove-shelly]").forEach(button=>button.addEventListener("click",()=>{content.shellyPlugs.splice(Number(button.dataset.removeShelly),1);renderShellys()}));
}

async function addFiles(index, files) {
  for (const file of files) {
    const data = await toDataUrl(file);
    if (backendAvailable || location.protocol !== "file:") {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"-")}`;
      uploads.push({id,data});
      content.upfits[index].images.push(`uploads/${id}`);
    } else {
      content.upfits[index].images.push(data);
    }
  }
  render();
}

function toDataUrl(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)})}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]))}

document.querySelector("#saveButton").addEventListener("click",async()=>{
  ["heading","subheading","attractHeading","lightButtonLabel","lightButtonDescription"].forEach(key=>content[key]=document.querySelector(`#${key}`).value.trim());
  ["idleSeconds","slideshowSeconds","lightDurationSeconds"].forEach(key=>content[key]=Number(document.querySelector(`#${key}`).value));
  content.showLightControl = document.querySelector("#showLightControl").checked;
  normalizeLightShow();
  content.shellyPlugs = content.shellyPlugs.map((plug,index)=>({name:plug.name.trim() || `Light Bar ${index + 1}`,ip:cleanIp(plug.ip)})).filter(plug=>plug.ip);
  content.shellyIp = content.shellyPlugs[0]?.ip || "";
  const message=document.querySelector("#message");message.textContent="Saving...";message.className="message";
  try {
    localStorage.setItem("jj-display-content", JSON.stringify(content));
    if (backendAvailable) {
      const response=await fetch("/api/content",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({content,uploads})});
      if(!response.ok)throw new Error();
      uploads.length=0;
      message.textContent="Saved. The display will update automatically within 30 seconds.";
      message.className="message success";
    } else if (githubSettings().ready) {
      await publishToGithub();
      uploads.length=0;
      message.textContent="Published to GitHub. The board will update automatically after GitHub finishes publishing, usually within 1-2 minutes.";
      message.className="message success";
    } else {
      message.textContent="Enter your GitHub username, repository name, and publishing token above, then press Save again.";
      message.className="message error";
    }
  } catch (error) {
    message.textContent=`Could not publish: ${error.message || "check the GitHub connection and try again."}`;
    message.className="message error";
  }
});

function githubSettings(){
  const owner=document.querySelector("#githubOwner").value.trim();
  const repo=document.querySelector("#githubRepo").value.trim();
  const token=document.querySelector("#githubToken").value.trim();
  sessionStorage.setItem("jj-github-owner",owner);
  sessionStorage.setItem("jj-github-repo",repo);
  return {owner,repo,token,ready:Boolean(owner&&repo&&token)};
}

function textToBase64(value){
  const bytes=new TextEncoder().encode(value);
  let binary="";
  bytes.forEach(byte=>binary+=String.fromCharCode(byte));
  return btoa(binary);
}

async function githubRequest(path, options={}){
  const {owner,repo,token}=githubSettings();
  const response=await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`,{
    ...options,
    headers:{
      "Accept":"application/vnd.github+json",
      "Authorization":`Bearer ${token}`,
      "X-GitHub-Api-Version":"2026-03-10",
      "Content-Type":"application/json",
      ...(options.headers||{})
    }
  });
  if(response.status===404&&(!options.method||options.method==="GET"))return null;
  if(!response.ok){
    let detail="";
    try{detail=(await response.json()).message||""}catch{}
    throw new Error(detail||`GitHub returned ${response.status}`);
  }
  return response.json();
}

async function publishGithubFile(path,base64Content,message){
  const existing=await githubRequest(path);
  const body={message,content:base64Content,branch:"main"};
  if(existing?.sha)body.sha=existing.sha;
  await githubRequest(path,{method:"PUT",body:JSON.stringify(body)});
}

async function publishToGithub(){
  const message=document.querySelector("#message");
  for(let index=0;index<uploads.length;index++){
    const upload=uploads[index];
    message.textContent=`Publishing photo ${index+1} of ${uploads.length}...`;
    await publishGithubFile(`uploads/${encodeURIComponent(upload.id)}`,upload.data.split(",",2)[1],`Add display photo ${upload.id}`);
  }
  message.textContent="Publishing display content...";
  await publishGithubFile("content.json",textToBase64(JSON.stringify(content,null,2)),"Update featured upfits display");
}

document.querySelector("#addSection").addEventListener("click",()=>{
  content.upfits.push({
    title:"New Featured Upfit",
    modelYear:"2025",
    builtFor:"Agency Name",
    agencyType:"Law Enforcement",
    description:"Describe the mission, major equipment, and special features of this upfit.",
    images:["assets/tahoe.jpg"]
  });
  render();
  const added=document.querySelector(".item:last-child");
  if(added){added.open=true;added.scrollIntoView({behavior:"smooth",block:"center"})}
});

document.querySelector("#addShelly").addEventListener("click",()=>{
  content.shellyPlugs.push({name:`Light Bar ${content.shellyPlugs.length + 1}`,ip:""});
  renderShellys();
  document.querySelector(".shelly-row:last-child input")?.focus();
});

function cleanIp(value){return String(value || "").trim().replace(/^https?:\/\//,"").replace(/\/+$/,"")}

async function testShellys(plugs){
  const message=document.querySelector("#message");
  const duration=Math.max(1,Number(document.querySelector("#lightDurationSeconds").value)||15);
  const ready=plugs.map(plug=>({...plug,ip:cleanIp(plug.ip)})).filter(plug=>plug.ip);
  if(!ready.length){message.textContent="Add an IP address to at least one Shelly Plug first.";message.className="message error";return}
  message.textContent=`Sending a ${duration} second demo to ${ready.length} Shelly plug${ready.length===1?"":"s"}...`;message.className="message";
  const results=await Promise.allSettled(ready.map(plug=>fetch(`http://${plug.ip}/rpc/Switch.Set?id=0&on=true&toggle_after=${duration}`,{mode:"no-cors",cache:"no-store"})));
  const sent=results.filter(result=>result.status==="fulfilled").length;
  message.textContent=sent===ready.length
    ? `Test command sent to ${sent} plug${sent===1?"":"s"}. They will automatically turn off after ${duration} seconds.`
    : `Command sent to ${sent} of ${ready.length} plugs. Confirm each plug is powered on and connected to the same network.`;
  message.className=sent===ready.length?"message success":"message error";
}

document.querySelector("#testLights").addEventListener("click",()=>testShellys(content.shellyPlugs));

load();
