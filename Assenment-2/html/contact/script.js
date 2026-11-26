const API_URL = "http://localhost:5000/api";

function getToken() {
  return localStorage.getItem("outreachToken");
}

async function apiRequest(path, options) {
  if (!getToken()) {
    window.location.href = "../login.html";
    throw new Error("Please login first");
  }

  const requestOptions = options || {};
  requestOptions.headers = requestOptions.headers || {};
  requestOptions.headers["Content-Type"] = "application/json";
  requestOptions.headers["Authorization"] = "Bearer " + getToken();

  const response = await fetch(API_URL + path, requestOptions);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

function getContactId() {
  return new URLSearchParams(window.location.search).get("id");
}

function tagsFromInput(value) {
  return value.split(",").map(function (tag) {
    return tag.trim();
  }).filter(function (tag) {
    return tag !== "";
  });
}

async function loadContacts() {
  const tableBody = document.querySelector(".contact-table-body");
  if (!tableBody) return;

  const searchInput = document.getElementById("contactSearch");
  const fieldSelect = document.getElementById("contactField");
  const search = searchInput ? searchInput.value.trim() : "";
  const field = fieldSelect ? fieldSelect.value : "";

  let path = "/contacts?page=1&limit=100";
  if (search) path += "&search=" + encodeURIComponent(search);
  if (field) path += "&field=" + encodeURIComponent(field);

  try {
    const response = await apiRequest(path);
    tableBody.innerHTML = "";

    if (!response.data || response.data.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="4">No contacts found</td></tr>';
      return;
    }

    response.data.forEach(function (contact) {
      const row = document.createElement("tr");
      row.innerHTML =
        "<td>" + (contact.name || "") + "</td>" +
        "<td>" + (contact.email || "") + "</td>" +
        "<td>" + (contact.company || "") + "</td>" +
        '<td>' +
          '<a href="contacts-detail.html?id=' + contact._id + '" class="view-btn">View</a> ' +
          '<a href="contacts-edit.html?id=' + contact._id + '" class="edit-btn">Edit</a> ' +
          '<button type="button" class="delete-btn" data-id="' + contact._id + '">Delete</button>' +
        "</td>";

      tableBody.appendChild(row);
    });

    tableBody.querySelectorAll(".delete-btn").forEach(function (button) {
      button.addEventListener("click", function () {
        window.location.href = "contacts-delete.html?id=" + button.dataset.id;
      });
    });
  } catch (error) {
    tableBody.innerHTML = '<tr><td colspan="4">' + error.message + "</td></tr>";
  }
}

async function loadContactDetail() {
  const contactId = getContactId();
  if (!contactId) return;

  try {
    const response = await apiRequest("/contacts/" + contactId);
    const contact = response.data;

    const fields = {
      detailName: contact.name,
      detailEmail: contact.email,
      detailPhone: contact.phone,
      detailCompany: contact.company
    };

    Object.keys(fields).forEach(function (id) {
      const element = document.getElementById(id);
      if (element) element.textContent = fields[id] || "-";
    });

    const updateForm = document.getElementById("updateContactForm");
    if (updateForm) {
      updateForm.addEventListener("submit", function (event) {
        event.preventDefault();
        window.location.href = "contacts-update.html?id=" + contactId;
      });
    }

    const deleteForm = document.getElementById("deleteContactFormLink");
    if (deleteForm) {
      deleteForm.addEventListener("submit", function (event) {
        event.preventDefault();
        window.location.href = "contacts-delete.html?id=" + contactId;
      });
    }
  } catch (error) {
    alert(error.message);
  }
}

async function loadContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;

  const contactId = getContactId();
  const cancelForm = document.getElementById("cancelContactForm");
  if (cancelForm) {
    cancelForm.addEventListener("submit", function (event) {
      event.preventDefault();
      window.location.href = contactId
        ? "contacts-detail.html?id=" + contactId
        : "contacts-main.html";
    });
  }

  if (contactId) {
    try {
      const response = await apiRequest("/contacts/" + contactId);
      const contact = response.data;

      document.getElementById("name").value = contact.name || "";
      document.getElementById("email").value = contact.email || "";
      document.getElementById("company").value = contact.company || "";
      document.getElementById("phone").value = contact.phone || "";
      document.getElementById("tags").value = (contact.tags || []).join(", ");
    } catch (error) {
      alert(error.message);
    }
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const body = {
      name: document.getElementById("name").value.trim(),
      email: document.getElementById("email").value.trim(),
      company: document.getElementById("company").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      tags: tagsFromInput(document.getElementById("tags").value)
    };

    try {
      if (contactId) {
        await apiRequest("/contacts/" + contactId, {
          method: "PUT",
          body: JSON.stringify(body)
        });
      } else {
        await apiRequest("/contacts", {
          method: "POST",
          body: JSON.stringify(body)
        });
      }

      window.location.href = "contacts-main.html";
    } catch (error) {
      alert(error.message);
    }
  });
}

async function deleteContact() {
  const form = document.getElementById("deleteContactForm");
  if (!form) return;

  const contactId = getContactId();
  const cancelForm = document.getElementById("cancelDeleteForm");
  if (cancelForm) {
    cancelForm.addEventListener("submit", function (event) {
      event.preventDefault();
      window.location.href = "contacts-detail.html?id=" + contactId;
    });
  }
  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    try {
      await apiRequest("/contacts/" + contactId, { method: "DELETE" });
      window.location.href = "contacts-main.html";
    } catch (error) {
      alert(error.message);
    }
  });
}

const searchButton = document.getElementById("contactSearchButton");
if (searchButton) {
  searchButton.addEventListener("click", loadContacts);
}

const logoutForm = document.getElementById("logoutForm");
if (logoutForm) {
  logoutForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } catch (error) {
      console.error(error.message);
    }

    localStorage.removeItem("outreachToken");
    window.location.href = "../login.html";
  });
}

loadContacts();
loadContactDetail();
loadContactForm();
deleteContact();
