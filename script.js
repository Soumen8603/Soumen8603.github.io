
document.addEventListener("DOMContentLoaded", () => {
  // existing year/avatar fallback
  const yearEl = document.getElementById("y");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  const img = document.querySelector(".avatar-img");
  if (img) {
    img.addEventListener("error", () => {
      console.warn("Profile image not found at img/profile.jpg. Update the src path.");
      img.style.display = "none";
    });
  }

 
