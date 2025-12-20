import { state, Languages, setLang, DEFAULT_LANG, startGame } from "./app.js";
import { menu, Views } from "./content/views.js";
import { projects, projectsTitle } from "./content/projects.js";
import { aboutView } from "./content/about.js";
import { contactView } from "./content/contact.js";
import { work, workTitle } from "./content/work.js";
import { introView } from "./content/intro.js";

const contentEl = document.getElementById("content");
const blockSeparator = " ".repeat(1);

export function render() {
  renderLangSelector();
  renderMenu();
  renderView();
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

function renderView() {
  contentEl.innerHTML = "";

  switch (state.view) {
    case Views.INTRO:
      contentEl.appendChild(newIntro());
      break;
    case Views.ABOUT:
      contentEl.appendChild(newAbout());
      break;
    case Views.PROJECTS:
      contentEl.appendChild(newProjects());
      break;
    case Views.WORK:
      contentEl.appendChild(newWork());
      break;
    case Views.CONTACT:
      contentEl.appendChild(newContact());
      break;

    default:
      renderElement("Under development");
  }
}

export function newGame(name, exitCallback) {
  const preEl = document.createElement("pre");
  const ok = startGame(preEl, name, () => {
    if (exitCallback) exitCallback();
    renderElement("\nGame exited.");
    contentEl.scrollTop = contentEl.scrollHeight;
  });

  if (!ok) {
    preEl.innerHTML = `Not found game '${name}'`;
  }

  return preEl;
}

export function newIntro() {
  return newText(introView);
}

export function newProjects() {
  return newBlocks(projects, projectsTitle);
}

export function newWork() {
  return newBlocks(work, workTitle);
}

export function newAbout() {
  return newText(aboutView);
}

export function newContact() {
  const pre = document.createElement("pre");

  contactView.forEach(({ label, url, text }) => {
    pre.append(document.createTextNode(`${label}:\n  `));

    const a = document.createElement("a");
    a.href = url;
    a.textContent = text;
    a.target = "_blank";
    a.rel = "noopener noreferrer";

    pre.append(a, document.createTextNode("\n\n"));
  });

  return pre;
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

function newBlocks(items, title) {
  const pre = document.createElement("pre");

  const titleTr = getTranslated(title);
  if (titleTr) {
    const el = document.createElement("span");
    el.textContent = `${titleTr}\n\n`;
    el.classList.add("view-title");
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

  return pre;
}

function newText(text) {
  const val = getTranslated(text);
  const pre = document.createElement("pre");
  pre.innerHTML = val;

  return pre;
}

function getTranslated(value) {
  return value?.[state.lang] ?? value?.[DEFAULT_LANG];
}

export function renderElement(element) {
  let node;

  if (element instanceof Node) {
    node = element;
  } else {
    const pre = document.createElement("pre");
    pre.textContent = Array.isArray(element) ? element.join("\n") : element;
    node = pre;
  }

  contentEl.appendChild(node);
  contentEl.scrollTop = contentEl.scrollHeight;
}

export function scroll(delta) {
  contentEl.scrollBy({
    top: contentEl.clientHeight * delta,
    behavior: "instant",
  });
}

export function clearContent() {
  contentEl.innerHTML = "";
}
