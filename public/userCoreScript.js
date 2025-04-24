document.addEventListener("DOMContentLoaded", function () {
  // Get session ID from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get("l_s");

  if (!sessionId) {
    // No session ID found, redirect to login
    window.location.href = "/index.html";
    return;
  }

  // Try to get username from localStorage (optional)
  const username = localStorage.getItem("username");
  if (username) {
    document.getElementById("username-display").textContent =
      `Welcome, ${username}`;
  }

  // Fetch user-specific data using the session ID
  fetchUserData(sessionId);
});

function fetchUserData(sessionId) {
  // Show loading state
  const loadingElement = document.getElementById("loading");
  const errorElement = document.getElementById("error-message");
  const dataContainer = document.getElementById("data-container");

  loadingElement.classList.remove("hidden");
  errorElement.classList.add("hidden");
  dataContainer.classList.add("hidden");

  // Create API endpoint to fetch user data with session
  fetch(`/data/students/`)
    .then((response) => {
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Session expired or invalid");
        }
        throw new Error("Error fetching data");
      }
      return response.json();
    })
    .then((data) => {
      // Hide loading and show data
      loadingElement.classList.add("hidden");
      dataContainer.classList.remove("hidden");

      // Display the user data
      displayUserData(data);
    })
    .catch((error) => {
      console.error("Error:", error);
      loadingElement.classList.add("hidden");
      errorElement.classList.remove("hidden");
      errorElement.textContent = error.message || "Failed to load data";
    });
}

function displayUserData(data) {
  const dataContainer = document.getElementById("data-container");

  // Clear previous content
  dataContainer.innerHTML = "";

  // Example: Display data based on what your API returns
  // This function should be customized based on your data structure

  const tranchesSection = document.createElement("div");
  tranchesSection.className = "data-section";

  const sectionTitle = document.createElement("h2");
  sectionTitle.textContent = "Students";
  tranchesSection.appendChild(sectionTitle);

  const tranchesList = document.createElement("ul");
  data.forEach((student) => {
    const item = document.createElement("li");
    item.textContent = `${student.name} ${student.surname}`;
    tranchesList.appendChild(item);
  });

  tranchesSection.appendChild(tranchesList);
  dataContainer.appendChild(tranchesSection);

  // Add similar sections for other data types (students, classrooms, etc.)

  // // If no data available
  // if (dataContainer.children.length === 0) {
  //   const noDataMessage = document.createElement("p");
  //   noDataMessage.textContent = "No data available for your account.";
  //   dataContainer.appendChild(noDataMessage);
  // }
}

function logout() {
  // Clear session data
  localStorage.removeItem("sessionId");
  localStorage.removeItem("username");

  // Redirect to login page
  window.location.href = "/index.html";
}
