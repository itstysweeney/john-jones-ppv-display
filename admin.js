let content = null;
let backendAvailable = false;
let openUpfitIndex = null;
const uploads = [];
const uploadPreviews = new Map();

function contentVersionMatches(value){
  return !window.JJ_DEFAULT_CONTENT?.contentVersion || value?.contentVersion === window.JJ_DEFAULT_CONTENT.contentVersion;
}

async function load() {
  const inferredOwner = location.hostname.endsWith(".github.io") ? location.hostname.split(".")[0] : "";
  const inferredRepo = location.hostname.endsWith(".github.io") ? location.pathname.split("/").filter(Boolean)[0] || "" : "";
  document.querySelector("#githubOwner").value = sessionStorage.getItem("jj-github-owner") || inferredOwner;
  document.querySelector("#githubRepo").value = sessionStorage.getItem("jj-github-repo") || inferredRepo || "john-jones-ppv-display";
  try {
    const saved = localStorage.getItem("jj-display-content");
    if (saved) {
      const savedContent = JSON.parse(saved);
      if (contentVersionMatches(savedContent)) content = savedContent;
      else localStorage.removeItem("jj-display-content");
    }
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
  normalizeUpfits();
  ["heading","subheading","attractHeading","idleSeconds","slideshowSeconds"].forEach(key => document.querySelector(`#${key}`).value = content[key] || "");
  render();
  showMode();
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

function previewImage(image) {
  return uploadPreviews.get(image) || image;
}

function isVideo(value) {
  return /^data:video\//i.test(value) || /\.(mp4|webm|mov|m4v|ogv)(?:[?#].*)?$/i.test(value);
}

function mediaPreview(media) {
  const source=escapeHtml(previewImage(media));
  return isVideo(source)
    ? `<video src="${source}" muted playsinline preload="metadata"></video><span class="video-badge">VIDEO</span>`
    : `<img src="${source}" alt="">`;
}

function render(openIndex = openUpfitIndex) {
  openUpfitIndex = Number.isInteger(openIndex) && content.upfits[openIndex] ? openIndex : null;
  const editor = document.querySelector("#editor");
  editor.innerHTML = content.upfits.map((upfit,index)=>`<details class="item" data-upfit-index="${index}" ${index===openUpfitIndex?"open":""}>
    <summary>
      <i class="drag-handle" data-drag-index="${index}" draggable="true" title="Drag to reorder" aria-label="Drag ${escapeHtml(upfit.title)} to reorder"><b></b><b></b><b></b></i>
      <span class="summary-media">${mediaPreview(upfit.images[0] || "assets/tahoe.jpg")}</span>
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
      <div class="photos">${upfit.images.map((image,imageIndex)=>`<div class="photo">${mediaPreview(image)}<button data-remove="${index}:${imageIndex}">X</button></div>`).join("")}</div>
      <label class="upload">Add Photos or Videos<input data-upload="${index}" type="file" accept="image/*,video/*" multiple></label>
    </div>
  </details>`).join("");
  document.querySelectorAll(".item").forEach(item=>item.addEventListener("toggle",()=>{
    const index=Number(item.dataset.upfitIndex);
    if(!item.open){
      if(openUpfitIndex===index)openUpfitIndex=null;
      return;
    }
    openUpfitIndex=index;
    document.querySelectorAll(".item[open]").forEach(other=>{if(other!==item)other.open=false});
  }));
  enableUpfitReordering();
  document.querySelectorAll("[data-title]").forEach(input=>input.addEventListener("input",()=>content.upfits[Number(input.dataset.title)].title=input.value));
  document.querySelectorAll("[data-build-field]").forEach(input=>input.addEventListener("input",()=>{
    const [field,index]=input.dataset.buildField.split(":");
    content.upfits[Number(index)][field]=input.value;
  }));
  document.querySelectorAll("[data-remove]").forEach(button=>button.addEventListener("click",()=>removePhoto(...button.dataset.remove.split(":").map(Number))));
  document.querySelectorAll("[data-upload]").forEach(input=>input.addEventListener("change",()=>addFiles(Number(input.dataset.upload),input.files)));
  document.querySelectorAll("[data-remove-section]").forEach(button=>button.addEventListener("click",()=>{
    const index=Number(button.dataset.removeSection);
    content.upfits.splice(index,1);
    if(openUpfitIndex===index)openUpfitIndex=null;
    else if(openUpfitIndex>index)openUpfitIndex-=1;
    render();
  }));
}

function removePhoto(upfitIndex, imageIndex) {
  const [removed] = content.upfits[upfitIndex].images.splice(imageIndex,1);
  const pendingIndex = uploads.findIndex(upload => removed === `uploads/${upload.id}`);
  if (pendingIndex >= 0) uploads.splice(pendingIndex,1);
  uploadPreviews.delete(removed);
  render(upfitIndex);
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
      if(openUpfitIndex===draggedIndex)openUpfitIndex=insertIndex;
      else openUpfitIndex=null;
      draggedIndex=null;
      render();
      const movedRow=document.querySelectorAll(".item")[insertIndex];
      movedRow?.classList.add("just-moved");
      movedRow?.scrollIntoView({behavior:"smooth",block:"center"});
    });
  });
}

async function addFiles(index, files) {
  for (const file of files) {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) continue;
    if (file.size > 24 * 1024 * 1024) {
      const message=document.querySelector("#message");
      message.textContent=`${file.name} is too large. Keep each video under 24 MB so Cloudflare can publish it.`;
      message.className="message error";
      continue;
    }
    const data = await toDataUrl(file);
    if (backendAvailable || location.protocol !== "file:") {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"-")}`;
      const imagePath = `uploads/${id}`;
      uploads.push({id,data});
      uploadPreviews.set(imagePath,data);
      content.upfits[index].images.push(imagePath);
    } else {
      content.upfits[index].images.push(data);
    }
  }
  render(index);
}

function toDataUrl(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)})}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]))}

document.querySelector("#saveButton").addEventListener("click",async()=>{
  ["heading","subheading","attractHeading"].forEach(key=>content[key]=document.querySelector(`#${key}`).value.trim());
  ["idleSeconds","slideshowSeconds"].forEach(key=>content[key]=Number(document.querySelector(`#${key}`).value));
  ["showLightControl","lightButtonLabel","lightButtonDescription","lightDurationSeconds","shellyIp","shellyPlugs"].forEach(key=>delete content[key]);
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
  openUpfitIndex=content.upfits.length-1;
  render(openUpfitIndex);
  const added=document.querySelector(".item:last-child");
  if(added){added.open=true;added.scrollIntoView({behavior:"smooth",block:"center"})}
});

load();
