// Landing page interactions

document.addEventListener('DOMContentLoaded', () => {

    // Mobile nav toggle if a hamburger button exists
    const toggleBtn = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('nav ul');

    if (toggleBtn && navLinks) {
        toggleBtn.addEventListener('click', () => {
            navLinks.classList.toggle('show');
        });
    }

    // Smooth highlight of active nav link while scrolling
    const sections = document.querySelectorAll('section[id]');
    const navLis = document.querySelectorAll('nav ul li a');

    function highlightNav() {
        let current = '';
        sections.forEach(section => {
            const top = window.scrollY;
            const offset = section.offsetTop - 120;
            if (top >= offset) {
                current = section.getAttribute('id');
            }
        });

        navLis.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
            }
        });
    }

    if (sections.length && navLis.length) {
        window.addEventListener('scroll', highlightNav);
    }

    // Footer year
    const yearEl = document.getElementById('year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }

});