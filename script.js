
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

  // Modal helpers
  function openModal(innerHTML){
    // overlay
    const overlay = document.createElement("div");
    overlay.className = "read-overlay";
    // panel
    const panel = document.createElement("div");
    panel.className = "read-panel";
    // close button
    const closeBtn = document.createElement("button");
    closeBtn.className = "read-close";
    closeBtn.setAttribute("aria-label","Close");
    closeBtn.type = "button";
    closeBtn.innerText = "×";

    // content
    const contentWrap = document.createElement("div");
    contentWrap.innerHTML = innerHTML;

    panel.appendChild(closeBtn);
    panel.appendChild(contentWrap);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    // focus trap entry
    closeBtn.focus();

    // close behaviors
    function cleanup(){
      overlay.remove();
      document.removeEventListener("keydown", onKey);
    }
    function onKey(e){
      if (e.key === "Escape") cleanup();
    }
    closeBtn.addEventListener("click", cleanup);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup();
    });
    document.addEventListener("keydown", onKey);
  }

  // Attach to all "Read" buttons
  document.querySelectorAll(".btn.read, .post .btn, .read-btn, button[aria-label='Read']").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();

      // If the post content is already in the DOM near the button, grab it.
      // Example selector: closest .post then its content paragraph(s)
      const post = btn.closest(".post");
      let html = "";

      if (post){
        // Try to collect a title + body
        const title = post.querySelector("h3, h2, .post-title");
        const body = Array.from(post.querySelectorAll("p, ul, ol")).map(n=>n.outerHTML).join("");
        html = `
          ${title ? title.outerHTML : ""}
          ${body || "<p>No additional content available.</p>"}
        `;
      } else if (btn.dataset.contentSelector){
        // Or fetch from another selector
        const target = document.querySelector(btn.dataset.contentSelector);
        html = target ? target.innerHTML : "<p>Content not found.</p>";
      } else if (btn.dataset.url){
        // Or fetch from a URL if provided
        try{
          const res = await fetch(btn.dataset.url, {credentials:"same-origin"});
          const text = await res.text();
          html = text;
        }catch(err){
          html = "<p>Failed to load content.</p>";
        }
      } else {
        html = "<p>No content source wired to this button.</p>";
      }

      openModal(html);
    });
  });
});

