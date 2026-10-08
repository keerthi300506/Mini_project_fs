/*
  Frontend configuration
  Paste your deployed Google Apps Script Web App URL here.
*/
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwMwcSeomv4f0hHfGA8p4IMxZQxZQnxiOMVMf4dZLF1Z3gob_Tx1UTxxV4DFtG3v467Gw/exec";

let reports = JSON.parse(localStorage.getItem("anitsReports") || "null") || [
  {id:"DEMO-001",type:"Found",name:"Black Wallet",category:"Accessories",location:"Library Entrance",date:"2026-09-14",description:"Black leather wallet found near the library entrance.",imageUrl:"",status:"Approved"},
  {id:"DEMO-002",type:"Lost",name:"College ID Card",category:"Documents",location:"Block A",date:"2026-09-13",description:"ANITS student ID card. Please report if found.",imageUrl:"",status:"Approved"},
  {id:"DEMO-003",type:"Found",name:"Wireless Earbuds",category:"Electronics",location:"CSE Lab",date:"2026-09-12",description:"Small black wireless earbuds case found in the lab.",imageUrl:"",status:"Approved"}
];
let claims = JSON.parse(localStorage.getItem("anitsClaims") || "[]");
let adminMode = sessionStorage.getItem("anitsAdmin") === "1";

document.querySelectorAll(".nav-btn").forEach(b => b.addEventListener("click",()=>showPage(b.dataset.page)));
document.getElementById("reportForm").addEventListener("submit", submitReport);
document.getElementById("claimForm").addEventListener("submit", submitClaim);

function showPage(id){
  if(id==="admin" && !adminMode){
    document.querySelectorAll(".page").forEach(x=>x.classList.remove("active-page"));
    document.getElementById("admin").classList.add("active-page");
    document.querySelectorAll(".nav-btn").forEach(x=>x.classList.toggle("active",x.dataset.page==="admin"));
    refreshAdmin();
    window.scrollTo({top:0,behavior:"smooth"});
    return;
  }
  document.querySelectorAll(".page").forEach(x=>x.classList.remove("active-page"));
  document.getElementById(id).classList.add("active-page");
  document.querySelectorAll(".nav-btn").forEach(x=>x.classList.toggle("active",x.dataset.page===id));
  if(id==="items") renderPublicItems();
  if(id==="admin") refreshAdmin();
  window.scrollTo({top:0,behavior:"smooth"});
}
function openModal(id){document.getElementById(id).classList.add("show")}
function closeModal(id){document.getElementById(id).classList.remove("show")}
function openReportChoice(){openModal("reportChoice")}
function openReportForm(type){
  closeModal("reportChoice");
  document.getElementById("reportType").value=type;
  document.getElementById("reportTitle").textContent=type==="Lost"?"Report a Lost Item":"Report a Found Item";
  document.getElementById("reportEyebrow").textContent=type.toUpperCase()+" REPORT";
  document.getElementById("itemDate").value=new Date().toISOString().slice(0,10);
  openModal("reportModal");
}

async function submitReport(e){
  e.preventDefault();
  const file=document.getElementById("itemImage").files[0];
  if(file && file.size>2*1024*1024){showToast("Please choose an image smaller than 2 MB.");return;}
  const record={
    id:"R-"+Date.now(),
    type:document.getElementById("reportType").value,
    name:document.getElementById("itemName").value.trim(),
    category:document.getElementById("category").value,
    location:document.getElementById("location").value.trim(),
    date:document.getElementById("itemDate").value,
    description:document.getElementById("description").value.trim(),
    reporterName:document.getElementById("reporterName").value.trim(),
    reporterEmail:document.getElementById("reporterEmail").value.trim(),
    status:"Pending",
    imageData:""
  };
  if(file) record.imageData=await fileToDataUrl(file);
  reports.unshift(record);
  saveLocal();
  closeModal("reportModal");
  e.target.reset();

  if(GOOGLE_SCRIPT_URL){
    try{
      await postToSheet(record);
      showToast("Report submitted. It is waiting for admin verification.");
    }catch(err){
      console.error(err);
      showToast("Saved locally, but Google Sheet submission failed. Check the Apps Script URL.");
    }
  }else{
    showToast("Demo mode: report saved locally. Add the Apps Script URL to connect Google Sheets.");
  }
  showPage("items");
}

function fileToDataUrl(file){
  return new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onload=()=>resolve(r.result);
    r.onerror=reject;
    r.readAsDataURL(file);
  });
}
async function postToSheet(payload){
  const response=await fetch(GOOGLE_SCRIPT_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload)});
  return response;
}

async function loadFromSheet(){
  if(!GOOGLE_SCRIPT_URL){showToast("Google Sheet is not connected yet; showing demo/local records.");renderPublicItems();return;}
  try{
    const res=await fetch(GOOGLE_SCRIPT_URL+"?action=public");
    const data=await res.json();
    if(data.success){reports=data.reports||[];saveLocal();renderPublicItems();showToast("Listings refreshed.");}
  }catch(err){console.error(err);showToast("Could not load Google Sheet. Check deployment and URL.");}
}

function renderPublicItems(){
  const q=(document.getElementById("search")?.value||"").toLowerCase();
  const type=document.getElementById("typeFilter")?.value||"All";
  const cat=document.getElementById("catFilter")?.value||"All";
  const list=reports.filter(r=>r.status==="Approved"&&(type==="All"||r.type===type)&&(cat==="All"||r.category===cat)&&[r.name,r.location,r.description,r.category].join(" ").toLowerCase().includes(q));
  const grid=document.getElementById("publicGrid");
  if(!list.length){grid.innerHTML='<div class="empty"><h3>No approved items found</h3><p>Try a different search or report an item.</p></div>';return;}
  grid.innerHTML=list.map(r=>`
    <article class="item-card">
      <div class="item-photo">${r.imageUrl?`<img src="${esc(r.imageUrl)}" alt="${esc(r.name)}">`:r.imageData?`<img src="${esc(r.imageData)}" alt="${esc(r.name)}">`:iconFor(r.category)}</div>
      <div class="item-body">
        <span class="badge ${r.type.toLowerCase()}">${r.type.toUpperCase()}</span>
        <h3>${esc(r.name)}</h3>
        <div class="meta">📍 ${esc(r.location)}<br>📅 ${esc(r.date)}<br>🏷️ ${esc(r.category)}</div>
        <p class="desc">${esc(r.description)}</p>
        <button class="claim-btn" onclick="openClaim('${escAttr(r.id)}')">I think this is mine</button>
      </div>
    </article>`).join("");
}

function iconFor(c){return c==="Electronics"?"🎧":c==="Documents"?"🪪":c==="Books"?"📚":c==="Keys"?"🔑":"🎒"}
function openClaim(id){
  const item=reports.find(r=>String(r.id)===String(id));if(!item)return;
  document.getElementById("claimItemId").value=item.id;
  document.getElementById("claimItemText").innerHTML=`You are claiming <b>${esc(item.name)}</b>. Your details will be sent to the admin and will not be shown publicly.`;
  openModal("claimModal");
}
async function submitClaim(e){
  e.preventDefault();
  const c={id:"C-"+Date.now(),itemId:document.getElementById("claimItemId").value,name:document.getElementById("claimName").value.trim(),email:document.getElementById("claimEmail").value.trim(),reason:document.getElementById("claimReason").value.trim(),status:"Pending"};
  claims.unshift(c);localStorage.setItem("anitsClaims",JSON.stringify(claims));closeModal("claimModal");e.target.reset();
  if(GOOGLE_SCRIPT_URL){try{await postToSheet({action:"claim",...c});showToast("Claim request sent to admin.");}catch(err){showToast("Claim saved locally, but Google Sheet submission failed.");}}
  else showToast("Demo mode: claim request saved locally.");
}

function adminLogin(){
  const id=document.getElementById("adminId").value.trim(),pw=document.getElementById("adminPass").value;
  if(id==="ADMIN"&&pw==="anits123"){adminMode=true;sessionStorage.setItem("anitsAdmin","1");document.getElementById("loginError").textContent="";refreshAdmin();showToast("Admin dashboard opened.");}
  else document.getElementById("loginError").textContent="Invalid demo credentials.";
}
function adminLogout(){adminMode=false;sessionStorage.removeItem("anitsAdmin");refreshAdmin()}
function refreshAdmin(){
  document.getElementById("adminLoginView").classList.toggle("hidden",adminMode);
  document.getElementById("dashboardView").classList.toggle("hidden",!adminMode);
  if(adminMode){updateStats();renderAdminReports();renderClaims()}
}
async function refreshAdminData(){
  if(GOOGLE_SCRIPT_URL){
    try{
      const res=await fetch(GOOGLE_SCRIPT_URL+"?action=admin");
      const data=await res.json();
      if(data.success){reports=data.reports||[];claims=data.claims||[];saveLocal();updateStats();renderAdminReports();renderClaims();}
    }catch(e){showToast("Could not refresh admin data from Google Sheet.");}
  }else refreshAdmin();
}
function updateStats(){
  document.getElementById("statTotal").textContent=reports.length;
  document.getElementById("statPending").textContent=reports.filter(r=>r.status==="Pending").length;
  document.getElementById("statLost").textContent=reports.filter(r=>r.type==="Lost").length;
  document.getElementById("statFound").textContent=reports.filter(r=>r.type==="Found").length;
  document.getElementById("statClaims").textContent=claims.filter(c=>c.status==="Pending").length;
}
function renderAdminReports(){
  const panel=document.getElementById("reportsPanel");
  const rows=reports.map(r=>`<div class="admin-row">
    <div><b>${esc(r.name)}</b><br><small>${esc(r.id)}</small></div>
    <div>${esc(r.type)}</div><div>${esc(r.category)}</div><div>${esc(r.location)}</div>
    <div class="status ${r.status.toLowerCase()}">${esc(r.status)}</div>
    <div class="admin-actions">${r.status==="Pending"?`<button class="mini approve" onclick="changeStatus('${escAttr(r.id)}','Approved')">Approve</button><button class="mini reject" onclick="changeStatus('${escAttr(r.id)}','Rejected')">Reject</button>`:"—"}<button class="mini delete" onclick="deleteReport('${escAttr(r.id)}')">Delete</button></div>
  </div>`).join("");
  panel.innerHTML=`<div class="admin-table"><div class="admin-row head"><div>Item</div><div>Type</div><div>Category</div><div>Location</div><div>Status</div><div>Action</div></div>${rows||"<div class='empty'>No reports.</div>"}</div>`;
}
function renderClaims(){
  const panel=document.getElementById("claimsPanel");
  if(!claims.length){panel.innerHTML="<div class='claims-box'>No claim requests.</div>";return}
  panel.innerHTML="<div class='claims-box'>"+claims.map(c=>{const item=reports.find(r=>String(r.id)===String(c.itemId));return `<div class="claim-row"><h4>${esc(item?.name||c.itemId)}</h4><p><b>${esc(c.name)}</b> • ${esc(c.email)}</p><p>${esc(c.reason)}</p><span class="status ${c.status.toLowerCase()}">${esc(c.status)}</span></div>`}).join("")+"</div>";
}
function setAdminTab(tab,btn){
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));btn.classList.add("active");
  document.getElementById("reportsPanel").classList.toggle("hidden",tab!=="reports");
  document.getElementById("claimsPanel").classList.toggle("hidden",tab!=="claims");
}
async function changeStatus(id,status){
  const r=reports.find(x=>String(x.id)===String(id));if(!r)return;
  r.status=status;saveLocal();updateStats();renderAdminReports();renderPublicItems();
  if(GOOGLE_SCRIPT_URL){try{await postToSheet({action:"status",id,status});showToast("Status updated in Google Sheet.");}catch(e){showToast("Updated locally; Google Sheet update failed.");}}
  else showToast("Status updated in demo mode.");
}
async function deleteReport(id){
  const r=reports.find(x=>String(x.id)===String(id));
  if(!r)return;
  if(!confirm(`Delete "${r.name}"? This will remove the report from the public page and Google Sheet.`))return;
  reports=reports.filter(x=>String(x.id)!==String(id));
  saveLocal();updateStats();renderAdminReports();renderPublicItems();
  if(GOOGLE_SCRIPT_URL){
    try{
      const res=await postToSheet({action:"delete",id});
      const data=await res.json();
      if(data.success){showToast("Report deleted successfully.");}
      else{showToast("Deleted locally, but Google Sheet deletion failed.");await refreshAdminData();}
    }catch(e){showToast("Deleted locally; Google Sheet deletion failed.");await refreshAdminData();}
  }else showToast("Report deleted in demo mode.");
}
function saveLocal(){localStorage.setItem("anitsReports",JSON.stringify(reports));localStorage.setItem("anitsClaims",JSON.stringify(claims))}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function escAttr(s=""){return String(s).replace(/'/g,"\\'").replace(/"/g,"&quot;")}
function showToast(msg){const t=document.getElementById("toast");t.textContent=msg;t.style.display="block";clearTimeout(window._toast);window._toast=setTimeout(()=>t.style.display="none",3800)}
renderPublicItems();
if(adminMode) refreshAdmin();
