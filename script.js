// script.js

// Function to generate project cards dynamically
function generateProjectCards() {
    const projectsContainer = document.getElementById('projects-container');
    if (!projectsContainer) {
        console.error("Projects container not found!");
        return;
    }

    // Clear existing content (if any)
    projectsContainer.innerHTML = '';

    projects.forEach(project => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'bg-white bg-opacity-10 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden';

        cardDiv.innerHTML = `
            <img src="${project.image}" alt="${project.alt}" class="w-full h-48 object-cover">
            <div class="p-6">
                <h3 class="text-2xl font-semibold text-white mb-2">${project.title}</h3>
                <p class="text-gray-300 text-sm mb-4">${project.description}</p>
                <div class="flex flex-wrap gap-2 mb-4">
                    ${project.technologies.map(tech => `<span class="text-xs font-semibold px-2 py-1 rounded-full ${tech.color} text-white">${tech.name}</span>`).join('')}
                </div>
                <a href="${project.link}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-200 font-medium inline-flex items-center">
                    View ${project.link.includes('github.com') ? 'Project Code' : 'Live Project'}
                    <svg class="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0l-7 7"></path></svg>
                </a>
            </div>
        `;
        projectsContainer.appendChild(cardDiv);
    });
}

// Mobile Navigation Bar active state logic
const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
mobileNavItems.forEach(item => {
    item.addEventListener('click', () => {
        mobileNavItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
    });
});

// Call the function to generate cards when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', generateProjectCards);
