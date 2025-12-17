import { state, Languages, setLang, DEFAULT_LANG } from "./app.js";
import { menu, Views } from "./content/views.js";
import { projects } from "./content/projects.js";
import { about } from "./content/about.js";
import { contacts } from "./content/contacts.js";

export function render() {
  renderLangSelector();
  renderMenu();
  renderContent();
  document.querySelectorAll('.tui-content a[href^="http"]').forEach((a) => {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  });
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
      renderBlocks(content, projects);
      break;

    case Views.ABOUT:
      renderText(content, about);
      break;

    case Views.CONTACT:
      renderText(content, contacts);
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

const separator = " ".repeat(1);
function renderBlocks(root, items) {
  const pre = document.createElement("pre");

  items.forEach((p, i) => {
    const name = document.createElement("strong");
    name.textContent = p.name;
    pre.append(name);

    if (p.url) {
      pre.append(document.createTextNode(" "));

      const link = document.createElement("a");
      link.href = p.url;
      link.textContent = "[link]";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", `Open ${p.name} project`);

      pre.append(link);
    }

    const desc = p.desc?.[state.lang] ?? p.desc?.[DEFAULT_LANG];
    if (desc) {
      pre.append(
        document.createTextNode("\n"),
        document.createTextNode(`  ${desc}\n`),
      );
    }

    if (p.tags?.length) {
      const tags = document.createElement("span");
      tags.className = "tags";
      tags.textContent = `  [${p.tags.join(" | ")}]`;
      pre.append(tags, document.createTextNode("\n"));
    }

    if (i < items.length - 1) {
      pre.append(document.createTextNode(`${separator}\n`));
    }
  });

  root.appendChild(pre);
}

function renderText(root, text) {
  const val = text[state.lang] ?? text[DEFAULT_LANG];
  root.innerHTML = `<pre>${val}</pre>`;
}
