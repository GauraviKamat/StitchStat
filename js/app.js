// js/app.js

let allCustomers = [];

// ---------- LOAD CUSTOMERS ----------
async function loadCustomers() {
  const container = document.getElementById("customerList");
  if (!container) return;

  const { data, error } = await db
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  allCustomers = data;
  renderCustomers(allCustomers);
}

// ---------- RENDER ----------
function renderCustomers(list) {
  const container = document.getElementById("customerList");
  if (!container) return;

  container.innerHTML = "";

  if (list.length === 0) {
    container.innerHTML = `<p style="text-align:center;">No customers found</p>`;
    return;
  }

  list.forEach(c => {
    const div = document.createElement("div");
    div.className = "customer-card";

    div.innerHTML = `
      <h3>${c.name}</h3>
      <p>📞 ${c.phone}</p>
    `;

    div.onclick = () => {
      window.location.href = `customer.html?id=${c.id}`;
    };

    container.appendChild(div);
  });
}

// ---------- SEARCH ----------
const searchInput = document.getElementById("searchInput");

if (searchInput) {
  searchInput.addEventListener("input", () => {
    const value = searchInput.value.trim().toLowerCase();

    if (!value) {
      renderCustomers(allCustomers);
      return;
    }

    const filtered = allCustomers.filter(c =>
      (c.name && c.name.toLowerCase().includes(value)) ||
      (c.phone && c.phone.includes(value))
    );

    renderCustomers(filtered);
  });
}

// ---------- NAVIGATION ----------
function goHome() {
  window.location.href = "index.html";
}

function goAddCustomer() {
  window.location.href = "add-customer.html";
}

function goBack() {
  history.back();
}

// ---------- INIT ----------
loadCustomers();