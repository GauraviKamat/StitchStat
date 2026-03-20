// js/customer.js
console.log("customer.js loaded");
// ---------- GLOBAL ----------
const params = new URLSearchParams(window.location.search);
const customerId = params.get("id");

let currentCustomerData = null;
window.currentMeasurementType = null;
window.editingMeasurementId = null;

// ---------- LOAD CUSTOMER ----------
if (customerId) loadCustomer();

async function loadCustomer() {
  const { data, error } = await db
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .single();

  if (error) return console.error(error);

  currentCustomerData = data;

  setText("custName", data.name);
  setText("custPhone", data.phone);
  setText("custNotes", data.notes || "");

  setupWhatsApp(data);
  loadMeasurements();
  loadWorks();
}

// ---------- HELPERS ----------
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}

// ---------- WHATSAPP ----------
function setupWhatsApp(data) {
  const btn = document.getElementById("whatsappBtn");
  if (!btn) return;

  btn.onclick = () => {
    let phone = data.phone.replace(/\D/g, "");
    if (!phone.startsWith("91")) phone = "91" + phone;

    const msg = encodeURIComponent(`Hello ${data.name}`);
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };
}

// ---------- EDIT CUSTOMER ----------
document.getElementById("editCustomerBtn")?.addEventListener("click", () => {
  document.getElementById("editName").value = currentCustomerData.name;
  document.getElementById("editPhone").value = currentCustomerData.phone;
  document.getElementById("editNotes").value = currentCustomerData.notes || "";

  document.getElementById("editCustomerModal").style.display = "flex";
});

document.getElementById("updateCustomerBtn")?.addEventListener("click", async () => {
  await db.from("customers")
    .update({
      name: document.getElementById("editName").value,
      phone: document.getElementById("editPhone").value,
      notes: document.getElementById("editNotes").value
    })
    .eq("id", customerId);

  closeEditCustomer();
  loadCustomer();
});

function closeEditCustomer() {
  document.getElementById("editCustomerModal").style.display = "none";
}

// ---------- DELETE CUSTOMER ----------
document.getElementById("deleteCustomerBtn")?.addEventListener("click", async () => {
  if (!confirm("Delete customer?")) return;

  await db.from("customers").delete().eq("id", customerId);
  window.location.href = "index.html";
});

// ---------- MEASUREMENTS ----------
const measurementConfig = {
  top: ["full_length","waist_length","hip_length","shoulder","sleeve_length","chest","waist","hips","front_neck","back_neck"],
  blouse: ["full_length","shoulder","sleeve_length","sleeves_bottom","biceps","arm_hole","upper_chest","chest","waist","tucks_point","front_full_length","tucks_distance","front_neck","back_neck","shoulder_patti"],
  pant: ["full_length","waist","hips","hip_length"]
};

function openMeasurement(type) {
  const container = document.getElementById("measurementFields");
  container.innerHTML = "";

  measurementConfig[type].forEach(key => {
    container.innerHTML += `
      <label>${formatLabel(key)}</label>
      <input type="text" name="${key}">
    `;
  });

  window.currentMeasurementType = type;
  document.getElementById("measurementModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("measurementModal").style.display = "none";
  window.editingMeasurementId = null;
}

document.getElementById("measurementForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const inputs = document.querySelectorAll("#measurementFields input");

  let data = {
    customer_id: customerId,
    type: window.currentMeasurementType
  };

  inputs.forEach(i => data[i.name] = i.value);

  if (window.editingMeasurementId) {
    await db.from("measurements")
      .update(data)
      .eq("id", window.editingMeasurementId);
  } else {
    await db.from("measurements").insert([data]);
  }

  closeModal();
  loadMeasurements();
});

async function loadMeasurements() {
  const container = document.getElementById("history");
  if (!container) return;

  const { data } = await db
    .from("measurements")
    .select("*")
    .eq("customer_id", customerId);

  container.innerHTML = "";

  data.forEach(m => {
    let rows = "";

    Object.keys(m).forEach(k => {
      if (!["id","customer_id","created_at","type"].includes(k) && m[k]) {
        rows += `<tr><td>${formatLabel(k)}</td><td>${m[k]}</td></tr>`;
      }
    });

    container.innerHTML += `
      <div class="customer-card">
        <h3>${m.type}</h3>
        <table class="measurement-table">${rows}</table>
        <div class="actions">
          <button class="btn edit" onclick="editMeasurement('${m.id}')">✏️ Edit</button>
          <button class="btn delete" onclick="deleteMeasurement('${m.id}')">🗑 Delete</button>
        </div>
      </div>
    `;
  });
}

async function editMeasurement(id) {
  const { data } = await db.from("measurements").select("*").eq("id", id).single();

  window.editingMeasurementId = id;
  openMeasurement(data.type);

  setTimeout(() => {
    Object.keys(data).forEach(k => {
      const input = document.querySelector(`[name="${k}"]`);
      if (input) input.value = data[k];
    });
  }, 100);
}

async function deleteMeasurement(id) {
  if (!confirm("Delete?")) return;
  await db.from("measurements").delete().eq("id", id);
  loadMeasurements();
}

// ---------- WORK FEATURE ----------

// compression (~50KB target)
async function compressImage(file, targetKB = 50) {
  return new Promise(resolve => {
    const img = new Image();
    const reader = new FileReader();

    reader.readAsDataURL(file);
    reader.onload = e => img.src = e.target.result;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      let quality = 0.8;

      function compress() {
        canvas.toBlob(blob => {
          if (blob.size / 1024 <= targetKB || quality <= 0.2) {
            resolve(blob);
          } else {
            quality -= 0.1;
            compress();
          }
        }, "image/jpeg", quality);
      }

      compress();
    };
  });
}

function getFilePathFromUrl(url) {
  return url.split("/work-images/")[1];
}

// modal
function openWorkModal() {
  document.getElementById("workModal").style.display = "flex";
}
function closeWorkModal() {
  document.getElementById("workModal").style.display = "none";
}

// SAVE WORK (FIXED)
async function saveWork() {
  try {
    const clothFile = document.getElementById("clothImage").files[0];
    const designFile = document.getElementById("designImage").files[0];
    const notes = document.getElementById("workNotes").value;

    let clothUrl = "";
    let designUrl = "";

    if (clothFile) {
      const compressed = await compressImage(clothFile, 50);
      const fileName = `cloth-${Date.now()}.jpg`;

      const { data, error } = await db.storage
        .from("work-images")
        .upload(fileName, compressed, { contentType: "image/jpeg", upsert: true });

      if (!error) {
        clothUrl = db.storage
          .from("work-images")
          .getPublicUrl(data.path).data.publicUrl;
      } else console.error(error);
    }

    if (designFile) {
      const compressed = await compressImage(designFile, 50);
      const fileName = `design-${Date.now()}.jpg`;

      const { data, error } = await db.storage
        .from("work-images")
        .upload(fileName, compressed, { contentType: "image/jpeg", upsert: true });

      if (!error) {
        designUrl = db.storage
          .from("work-images")
          .getPublicUrl(data.path).data.publicUrl;
      } else console.error(error);
    }

    await db.from("works").insert([{
      customer_id: customerId,
      cloth_image: clothUrl,
      design_image: designUrl,
      notes
    }]);

    closeWorkModal();
    loadWorks();

  } catch (err) {
    console.error("SAVE ERROR:", err);
  }
}

// LOAD WORKS
async function loadWorks() {
  const container = document.getElementById("workList");
  if (!container) return;

  const { data } = await db
    .from("works")
    .select("*")
    .eq("customer_id", customerId);

  container.innerHTML = "";

  data.forEach(w => {
    container.innerHTML += `
    
      <div class="customer-card">
        <div class="work-images">
        ${w.cloth_image ? `
        <div class="img-box">
          <span class="img-label">Cloth</span>
          <img src="${w.cloth_image}">
        </div>
      ` : ""}
  
      ${w.design_image ? `
        <div class="img-box">
          <span class="img-label">Design</span>
          <img src="${w.design_image}">
        </div>
      ` : ""}
        </div>
        <p class="work-notes">${w.notes || ""}</p>
        <button class="btn delete" onclick="deleteWork('${w.id}')">Delete</button>
      </div>
    `;
  });
}

// DELETE WORK
async function deleteWork(id) {
  if (!confirm("Delete?")) return;

  const { data } = await db.from("works").select("*").eq("id", id).single();

  const paths = [];
  if (data.cloth_image) paths.push(getFilePathFromUrl(data.cloth_image));
  if (data.design_image) paths.push(getFilePathFromUrl(data.design_image));

  if (paths.length) {
    await db.storage.from("work-images").remove(paths);
  }

  await db.from("works").delete().eq("id", id);
  loadWorks();
}

// ---------- FORMAT ----------
function formatLabel(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

// ---------- BIND SAVE BUTTON ----------
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("saveWorkBtn")?.addEventListener("click", saveWork);
});