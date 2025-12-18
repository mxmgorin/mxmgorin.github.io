import { state, Languages, setLang, DEFAULT_LANG } from "./app.js";
import { menu, Views } from "./content/views.js";
import { projects, projectsTitle } from "./content/projects.js";
import { about } from "./content/about.js";
import { contacts } from "./content/contacts.js";
import { work, workTitle } from "./content/work.js";

export function render() {
  renderLangSelector();
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
    case Views.ABOUT:
      renderText(content, about);
      break;
    case Views.PROJECTS:
      renderBlocks(content, projects, projectsTitle);
      break;
    case Views.WORK:
      renderBlocks(content, work, workTitle);
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

const blockSeparator = " ".repeat(1);

function renderBlocks(root, items, title) {
  const pre = document.createElement("pre");

  const titleTr = getTranslated(title);
  if (titleTr) {
    const el = document.createElement("span");
    el.textContent = `${titleTr}\n\n`;
    pre.append(el);
  }

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

    const desc = getTranslated(p.desc);
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
      pre.append(document.createTextNode(`${blockSeparator}\n`));
    }
  });

  root.appendChild(pre);
}

function renderText(root, text) {
  const val = text[state.lang] ?? text[DEFAULT_LANG];
  root.innerHTML = `<pre>${val}</pre>`;
}

function getTranslated(value) {
  return value?.[state.lang] ?? value?.[DEFAULT_LANG];
}
