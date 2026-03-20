const form = document.getElementById("customerForm");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    let name = document.getElementById("name").value;
    let phone = document.getElementById("phone").value;
    let notes = document.getElementById("notes").value;

    console.log("Sending:", name, phone, notes);

    const { data, error } = await db
        .from("customers")
        .insert([{ name, phone, notes }])
        .select();

    console.log("Response:", data, error);

    if (error) {
        alert("Error saving customer");
        console.log(error);
        return;
    }

    alert("Customer saved!");
    window.location.href = "index.html";
});