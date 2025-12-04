document.addEventListener("DOMContentLoaded", function() {
    loadMenu();
});

function loadMenu() {
    const placeholder = document.getElementById("menu-placeholder");
    if (!placeholder) return;

    fetch("menu.html")
        .then(response => response.text())
        .then(html => {
            placeholder.innerHTML = html;
            highlightActiveLink();
        })
        .catch(err => console.error("Erreur chargement menu:", err));
}

function highlightActiveLink() {
    // Met en gras le lien de la page actuelle
    let page = window.location.pathname.split("/").pop();
    if(page === "") page = "index.html";
    
    const links = document.querySelectorAll(".nav-links a");
    links.forEach(link => {
        if(link.getAttribute("href") === page) link.classList.add("active");
    });
}

// Fonction pour ouvrir/fermer le menu sur mobile
function toggleMenu() {
    const nav = document.getElementById('nav-links');
    nav.classList.toggle('active');
}
