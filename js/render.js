import { state, Languages, setLang } from "./app.js";
import { menu, Views } from "./content/views.js";
import { renderProjects } from "./content/projects.js";
import { renderAbout } from "./content/about.js";

export function render() {
  // renderLangSelector()
  renderMenu();
  renderContent();
}

function renderMenu() {
  const ul = document.querySelector(".tui-menu ul");
  ul.innerHTML = "";

  menu.forEach((item, i) => {
    const li = document.createElement("li");
    li.textContent = item;
    if (i === state.menuIndex) li.classList.add("active");
    ul.appendChild(li);
  });
}

function renderContent() {
  const content = document.getElementById("content");
  content.innerHTML = "";

  switch (state.view) {
    case Views.PROJECTS:
      renderProjects(content);
      break;

    case Views.ABOUT:
      renderAbout(content);
      break;

    default:
      content.innerHTML = `<pre>Under development</pre>`;
  }
}

function renderLangSelector() {
  const el = document.querySelector(".tui-header .lang");
  if (!el) return;

  el.innerHTML = "";

  Object.values(Languages).forEach((lang) => {
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = lang.toUpperCase();

    if (state.lang === lang) {
      a.classList.add("active");
    }

    a.onclick = (e) => {
      e.preventDefault();
      setLang(lang);
      render();
    };

    el.append(a, document.createTextNode(" | "));
  });

  el.lastChild.remove(); // remove trailing separator
}
